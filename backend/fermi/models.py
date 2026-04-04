from django.db import models


class CatalogSource(models.Model):

    class Catalog(models.TextChoices):
        FERMI_4FGL = "fermi_4fgl", "Fermi 4FGL"
        HAWC       = "hawc",       "HAWC"
        LHAASO     = "lhaaso",     "LHAASO"
        TEVCAT     = "tevcat",     "TeVCat"
        NED        = "ned",        "NED"

    catalog       = models.CharField(max_length=32, choices=Catalog.choices, db_index=True)
    source_name   = models.CharField(max_length=256, db_index=True)

    # Sky position (ICRS degrees, J2000)
    ra            = models.FloatField()
    dec           = models.FloatField()
    pos_err_deg   = models.FloatField(null=True, blank=True)  # 1-sigma degrees

    # HEALPix spatial index — NESTED scheme, nside=4096 (~0.86 arcmin resolution)
    healpix_id    = models.BigIntegerField(db_index=True)

    # Flux / spectral (nullable; not all catalogs provide these)
    flux          = models.FloatField(null=True, blank=True)
    flux_err      = models.FloatField(null=True, blank=True)
    flux_unit     = models.CharField(max_length=32, blank=True)
    energy_min_gev = models.FloatField(null=True, blank=True)
    energy_max_gev = models.FloatField(null=True, blank=True)
    spectral_index = models.FloatField(null=True, blank=True)

    source_class  = models.CharField(max_length=128, blank=True)

    # Catalog-specific extras (raw columns that don't map to shared fields)
    extra         = models.JSONField(default=dict)

    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("catalog", "source_name")]
        indexes = [
            models.Index(fields=["healpix_id"]),
            models.Index(fields=["catalog", "healpix_id"]),
        ]

    def __str__(self):
        return f"{self.catalog}:{self.source_name}"


class CrossMatch(models.Model):

    class Method(models.TextChoices):
        NAME     = "name",     "Matched by name"
        POSITION = "position", "Matched by position"

    # source_a always has the lower pk of the pair (prevents duplicate pairs)
    source_a      = models.ForeignKey(
        CatalogSource, on_delete=models.CASCADE, related_name="crossmatches_as_a"
    )
    source_b      = models.ForeignKey(
        CatalogSource, on_delete=models.CASCADE, related_name="crossmatches_as_b"
    )
    separation_deg = models.FloatField()  # 0.0 for name matches
    method        = models.CharField(max_length=16, choices=Method.choices)
    confidence    = models.FloatField(default=1.0)  # 0–1; 1.0 for name matches

    class Meta:
        unique_together = [("source_a", "source_b")]
        indexes = [
            models.Index(fields=["source_a"]),
            models.Index(fields=["source_b"]),
        ]

    def __str__(self):
        return f"{self.source_a} <-> {self.source_b} ({self.method})"
