from typing import List, Optional
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D
from django.contrib.gis.geos import Point
from django.db.models import QuerySet

from sources.models import Source, CatalogEntry


class CrossMatchService:
    """
    Service for cross-matching catalog sources with unified Source records.
    Uses GeoDjango spatial queries for efficient matching.
    """

    def __init__(self, match_radius_deg: float = 0.2):
        """
        Initialize cross-match service.

        Args:
            match_radius_deg: Matching radius in degrees (default 0.2 deg = ~12 arcmin)
        """
        self.match_radius_deg = match_radius_deg

    def match_or_create(
        self,
        name: str,
        ra: float,
        dec: float,
        catalog_name: str,
        original_name: str,
        metadata: dict = None,
        discovery_method: str = "",
        confidence: float = 1.0,
    ) -> Source:
        """
        Find or create a unified Source via spatial matching.

        Algorithm:
        1. Query for existing sources within match_radius_deg
        2. If found: reuse Source, create CatalogEntry
        3. If not found: create new Source and CatalogEntry

        Args:
            name: Suggested unified name for source
            ra: Right Ascension [degrees]
            dec: Declination [degrees]
            catalog_name: Catalog identifier (FERMI, LHAASO, etc.)
            original_name: Original name in source catalog
            metadata: Catalog-specific metadata dict
            discovery_method: Detection method (e.g., 'gamma-ray')
            confidence: Cross-match confidence (0.0-1.0)

        Returns:
            Source: The unified Source object (created or existing)
        """
        if metadata is None:
            metadata = {}

        # Search for nearby sources
        nearby_sources = self.find_nearby(ra, dec, self.match_radius_deg)

        if nearby_sources.exists():
            # Reuse closest source
            source = nearby_sources.first()
        else:
            # Create new unified source
            source = Source.objects.create(
                unified_name=name,
                ra=ra,
                dec=dec,
                primary_catalog=catalog_name,
            )

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
            Source.objects.filter(
                position__distance_lte=(point, D(km=distance_km))
            )
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
                catalog_entry_count = CatalogEntry.objects.filter(
                    source=source
                ).count()
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
