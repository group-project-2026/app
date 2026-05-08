import math
from typing import List, Optional
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D
from django.contrib.gis.geos import Point
from django.db.models import QuerySet

from sources.models import Source, CatalogEntry
from catalogs.position_errors import (
    PositionError,
    CircularPositionError,
    EllipticalPositionError,
    CombinedPositionError,
    ConfidenceCalculator,
    extract_position_error_from_metadata,
)


class CrossMatchService:
    """
    Service for cross-matching catalog sources with unified Source records.
    Uses GeoDjango spatial queries for efficient matching.
    Incorporates position measurement errors for scientifically-sound matching.
    """

    def __init__(
        self,
        match_radius_deg: float = 0.2,
        n_sigma_match: float = 2.5,
        use_position_errors: bool = True,
        confidence_method: str = "gaussian",
    ):
        """
        Initialize cross-match service.

        Args:
            match_radius_deg: Fallback match radius in degrees (default 0.2 deg)
            n_sigma_match: N-sigma for dynamic radius (default 2.5 = 98.8%)
            use_position_errors: Enable error-based matching (default True)
            confidence_method: 'gaussian' or 'mahalanobis' (default 'gaussian')
        """
        self.match_radius_deg = match_radius_deg
        self.n_sigma_match = n_sigma_match
        self.use_position_errors = use_position_errors
        self.confidence_method = confidence_method

    def _extract_position_error(
        self, metadata: dict, catalog_name: str
    ) -> Optional[PositionError]:
        """
        Extract position error from metadata using utility function.

        Args:
            metadata: Catalog-specific metadata dict
            catalog_name: Catalog identifier (for logging)

        Returns:
            PositionError object or None if not available
        """
        return extract_position_error_from_metadata(metadata)

    def _calculate_match_radius(
        self,
        source_error: Optional[PositionError],
        catalog_error: Optional[PositionError],
    ) -> float:
        """
        Calculate dynamic match radius based on position errors.

        Falls back to hardcoded radius if errors unavailable.

        Args:
            source_error: Position error from existing source
            catalog_error: Position error from catalog entry

        Returns:
            Match radius in degrees
        """
        if not self.use_position_errors:
            return self.match_radius_deg

        if source_error and catalog_error:
            combined = CombinedPositionError(source_error, catalog_error)
            return combined.get_match_radius(self.n_sigma_match)

        # Partial error information: estimate missing as fraction of hardcoded
        if source_error:
            default_error = CircularPositionError(self.match_radius_deg / 3.0)
            combined = CombinedPositionError(source_error, default_error)
            return combined.get_match_radius(self.n_sigma_match)

        if catalog_error:
            default_error = CircularPositionError(self.match_radius_deg / 3.0)
            combined = CombinedPositionError(catalog_error, default_error)
            return combined.get_match_radius(self.n_sigma_match)

        # No error information: use hardcoded fallback
        return self.match_radius_deg

    def _calculate_confidence(
        self,
        separation_deg: float,
        source_error: Optional[PositionError],
        catalog_error: Optional[PositionError],
    ) -> float:
        """
        Calculate match confidence based on separation and errors.

        Args:
            separation_deg: Angular separation in degrees
            source_error: Position error from existing source
            catalog_error: Position error from catalog entry

        Returns:
            Confidence in range [0, 1]
        """
        if not self.use_position_errors:
            # Legacy behavior: perfect confidence if within radius
            return 1.0 if separation_deg <= self.match_radius_deg else 0.0

        # If no errors available, fall back to radius-based
        if not source_error and not catalog_error:
            return 1.0 if separation_deg <= self.match_radius_deg else 0.0

        # Calculate combined error
        combined_error = None
        if source_error and catalog_error:
            combined_error = CombinedPositionError(source_error, catalog_error)
        elif source_error:
            default_error = CircularPositionError(self.match_radius_deg / 3.0)
            combined_error = CombinedPositionError(source_error, default_error)
        elif catalog_error:
            default_error = CircularPositionError(self.match_radius_deg / 3.0)
            combined_error = CombinedPositionError(catalog_error, default_error)

        if combined_error is None:
            return 1.0 if separation_deg <= self.match_radius_deg else 0.0

        # Use statistical confidence method
        if self.confidence_method == "gaussian":
            calc = ConfidenceCalculator()
            return calc.gaussian_confidence(separation_deg, combined_error.get_combined_sigma())
        elif self.confidence_method == "mahalanobis":
            # Use Mahalanobis if both errors are elliptical
            if isinstance(source_error, EllipticalPositionError) and isinstance(
                catalog_error, EllipticalPositionError
            ):
                calc = ConfidenceCalculator()
                return calc.mahalanobis_confidence(
                    separation_deg, source_error, catalog_error
                )
            else:
                # Fall back to Gaussian for mixed error types
                calc = ConfidenceCalculator()
                return calc.gaussian_confidence(
                    separation_deg, combined_error.get_combined_sigma()
                )

        return 1.0  # Safety fallback

    def match_or_create(
        self,
        name: str,
        ra: float,
        dec: float,
        catalog_name: str,
        original_name: str,
        metadata: dict = None,
        discovery_method: str = "",
        confidence: float = None,
    ) -> Source:
        """
        Find or create a unified Source via spatial matching.

        Incorporates position measurement errors for dynamic radius and confidence.

        Algorithm:
        1. Extract position error from metadata (if available)
        2. Calculate dynamic match radius based on errors
        3. Query for existing sources within dynamic radius
        4. If found: calculate confidence, reuse Source
        5. If not found: create new Source with high confidence

        Args:
            name: Suggested unified name for source
            ra: Right Ascension [degrees]
            dec: Declination [degrees]
            catalog_name: Catalog identifier (FERMI, LHAASO, etc.)
            original_name: Original name in source catalog
            metadata: Catalog-specific metadata dict
            discovery_method: Detection method (e.g., 'gamma-ray')
            confidence: Cross-match confidence (0.0-1.0). If None, calculated from errors.

        Returns:
            Source: The unified Source object (created or existing)
        """
        if metadata is None:
            metadata = {}

        # Extract position error from metadata
        catalog_error = self._extract_position_error(metadata, catalog_name)

        # Calculate dynamic match radius
        match_radius = self._calculate_match_radius(None, catalog_error)

        # Search for nearby sources
        nearby_sources = self.find_nearby(ra, dec, match_radius)

        if nearby_sources.exists():
            # Reuse closest source
            source = nearby_sources.first()

            # Calculate distance for confidence scoring
            point = Point(ra, dec, srid=4326)
            from django.contrib.gis.measure import D as DjangoDist

            distance_m = source.position.distance(point) * 111000  # degrees to meters
            separation_deg = distance_m / 111000

            # Extract source error if available (for confidence calculation)
            source_error = None
            source_entries = CatalogEntry.objects.filter(source=source)
            for entry in source_entries:
                extracted_error = self._extract_position_error(entry.metadata, entry.catalog_name)
                if extracted_error:
                    source_error = extracted_error
                    break

            # Calculate confidence
            if confidence is None:
                confidence = self._calculate_confidence(separation_deg, source_error, catalog_error)
        else:
            # Create new unified source
            source = Source.objects.create(
                unified_name=name,
                ra=ra,
                dec=dec,
                primary_catalog=catalog_name,
            )

            # New source: high confidence
            if confidence is None:
                confidence = 1.0

        # Create or update catalog entry
        catalog_entry, created = CatalogEntry.objects.update_or_create(
            source=source,
            catalog_name=catalog_name,
            original_name=original_name,
            defaults={
                "metadata": metadata,
                "discovery_method": discovery_method,
                "confidence": confidence,
            },
        )

        return source

    def find_nearby(
        self, ra: float, dec: float, radius_deg: float = None
    ) -> QuerySet:
        """
        Query for sources within radius degrees of given position.
        Uses PostGIS ST_DWithin for efficient spatial search.

        Args:
            ra: Right Ascension [degrees]
            dec: Declination [degrees]
            radius_deg: Search radius in degrees (uses default if None)

        Returns:
            QuerySet: Sources within radius, ordered by distance
        """
        if radius_deg is None:
            radius_deg = self.match_radius_deg

        point = Point(ra, dec, srid=4326)

        # Convert degrees to kilometers for distance measurement
        # 1 degree ≈ 111 km at equator (sufficiently accurate for spatial queries)
        distance_km = radius_deg * 111

        return (
            Source.objects.filter(position__distance_lte=(point, D(km=distance_km)))
            .annotate(distance=Distance("position", point))
            .order_by("distance")
        )

    def batch_match(
        self, sources_data: List[dict], catalog_name: str
    ) -> tuple[int, int]:
        """
        Perform batch cross-matching for multiple sources.

        Args:
            sources_data: List of dicts with 'name', 'ra', 'dec', etc.
            catalog_name: Catalog identifier

        Returns:
            Tuple of (created_count, matched_count)
        """
        created_count = 0
        matched_count = 0

        for source_data in sources_data:
            try:
                source = self.match_or_create(
                    name=source_data.get("name", ""),
                    ra=source_data["ra"],
                    dec=source_data["dec"],
                    catalog_name=catalog_name,
                    original_name=source_data.get("name", ""),
                    metadata=source_data.get("metadata", {}),
                    discovery_method=source_data.get("discovery_method", ""),
                )

                # Check if source was newly created
                catalog_entry_count = CatalogEntry.objects.filter(source=source).count()
                if catalog_entry_count == 1:
                    created_count += 1
                else:
                    print(
                        f"Matched existing source {source.unified_name} for {source_data.get('name', 'unknown')}"
                    )
                    matched_count += 1

            except Exception as e:
                # Log error but continue processing
                print(f"Error processing source {source_data.get('name', 'unknown')}: {e}")
                continue

        return created_count, matched_count
