from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import Point


class Source(gis_models.Model):
    """
    Unified astronomical source across multiple catalogs.
    Represents a single astronomical object that may appear in multiple catalogs.
    """

    CATALOG_CHOICES = [
        ("FERMI", "Fermi-LAT"),
        ("LHAASO", "LHAASO"),
        ("HAWC", "HAWC"),
        ("TEVCAT", "TeVCat"),
        ("NED", "NASA Extragalactic Database"),
    ]

    # Identification
    unified_name = models.CharField(
        max_length=128,
        unique=True,
        db_index=True,
        help_text="Unified name for this source across catalogs",
    )

    # Position (J2000, ICRS)
    ra = models.FloatField(help_text="Right Ascension J2000 [degrees]")
    dec = models.FloatField(help_text="Declination J2000 [degrees]")
    position = gis_models.PointField(
        srid=4326,
        help_text="Geographic point (RA, DEC) for spatial queries",
    )

    # Metadata
    discovery_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date of discovery or first observation",
    )
    primary_catalog = models.CharField(
        max_length=16,
        choices=CATALOG_CHOICES,
        help_text="Catalog with most recent/authoritative data",
    )

    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "sources_source"
        ordering = ["unified_name"]
        indexes = [
            models.Index(fields=["ra", "dec"]),
            models.Index(fields=["primary_catalog"]),
        ]

    def __str__(self) -> str:
        return f"{self.unified_name} ({self.primary_catalog})"

    def save(self, *args, **kwargs):
        """Automatically generate position PointField from ra/dec"""
        if self.ra is not None and self.dec is not None:
            self.position = Point(self.ra, self.dec, srid=4326)
        super().save(*args, **kwargs)


class CatalogEntry(models.Model):
    """
    Track individual catalog entries linked to unified Source.
    Stores catalog-specific data and cross-match metadata.
    """

    CATALOG_CHOICES = Source.CATALOG_CHOICES

    # Foreign key to unified source
    source = models.ForeignKey(
        Source,
        on_delete=models.CASCADE,
        related_name="catalog_entries",
        help_text="Link to unified Source",
    )

    # Catalog identification
    catalog_name = models.CharField(
        max_length=16,
        choices=CATALOG_CHOICES,
        db_index=True,
        help_text="Source catalog",
    )
    original_name = models.CharField(
        max_length=128,
        help_text="Source name in original catalog",
    )

    # Cross-match metadata
    metadata = models.JSONField(
        default=dict,
        help_text="Catalog-specific data (flux, spectrum, classification, etc.)",
    )
    discovery_method = models.CharField(
        max_length=64,
        blank=True,
        help_text="Detection method (e.g., 'gamma-ray', 'X-ray')",
    )
    confidence = models.FloatField(
        default=1.0,
        help_text="Cross-match confidence (0.0-1.0)",
    )

    # Tracking
    last_verified = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "sources_catalog_entry"
        unique_together = [("catalog_name", "original_name")]
        indexes = [
            models.Index(fields=["catalog_name"]),
            models.Index(fields=["source"]),
        ]
        ordering = ["catalog_name", "original_name"]

    def __str__(self) -> str:
        return f"{self.catalog_name}:{self.original_name}"
