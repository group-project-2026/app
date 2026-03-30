from django.db import models


class FermiSource(models.Model):
    """
    Źródło gamma z katalogu Fermi-LAT 4FGL.
    Jedna instancja = jedno źródło punktowe.
    """

    # --- Identyfikacja ---
    source_name = models.CharField(max_length=32, unique=True, db_index=True)
    source_class = models.CharField(max_length=8, blank=True, db_index=True)
    associated_name = models.CharField(max_length=64, blank=True)  # np. "3C 279"

    # --- Pozycja ---
    ra = models.FloatField(help_text="Right Ascension J2000 [deg]")
    dec = models.FloatField(help_text="Declination J2000 [deg]")
    glon = models.FloatField(help_text="Galactic longitude [deg]")
    glat = models.FloatField(help_text="Galactic latitude [deg]")

    # --- Pozycja niepewność (95% confidence ellipse) ---
    pos_err_semi_major = models.FloatField(null=True, blank=True, help_text="[deg]")
    pos_err_semi_minor = models.FloatField(null=True, blank=True, help_text="[deg]")
    pos_err_angle = models.FloatField(null=True, blank=True, help_text="[deg]")

    # --- Zintegrowany flux (100 MeV – 100 GeV) ---
    flux1000 = models.FloatField(null=True, blank=True, help_text="[ph cm⁻² s⁻¹]")
    flux1000_err = models.FloatField(null=True, blank=True)

    # --- Znaczność detekcji ---
    significance = models.FloatField(null=True, blank=True, help_text="Signif_Avg [sigma]")
    ts = models.FloatField(null=True, blank=True, help_text="Test Statistic")

    # --- Właściwości spektralne ---
    spectral_type = models.CharField(
        max_length=16, blank=True,
        help_text="PowerLaw | LogParabola | PLExpCutoff"
    )
    pivot_energy = models.FloatField(null=True, blank=True, help_text="[MeV]")
    spectral_index = models.FloatField(null=True, blank=True)
    spectral_index_err = models.FloatField(null=True, blank=True)

    # --- Redshift (AGN) ---
    redshift = models.FloatField(null=True, blank=True, db_index=True)

    # --- Zmienność ---
    variability_index = models.FloatField(null=True, blank=True)
    is_variable = models.BooleanField(default=False)

    # --- Flagi jakości ---
    flags = models.IntegerField(default=0, help_text="Bitmask z katalogu 4FGL")

    # --- Metadane ---
    data_release = models.SmallIntegerField(
        default=2, help_text="4FGL DataRelease: 1=DR1, 2=DR2, …"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "fermi_source"
        ordering = ["-significance"]
        indexes = [
            models.Index(fields=["ra", "dec"]),
            models.Index(fields=["source_class"]),
            models.Index(fields=["redshift"]),
        ]

    def __str__(self) -> str:
        return f"{self.source_name} ({self.source_class or '?'})"

    @property
    def has_quality_issues(self) -> bool:
        return self.flags != 0


class SedPoint(models.Model):
    """
    Jeden punkt widma SED (flux w paśmie energetycznym).
    Frontend dostaje listę tych punktów dla danego źródła.
    """

    BAND_CHOICES = [
        (1, "50–100 MeV"),
        (2, "100–300 MeV"),
        (3, "300 MeV–1 GeV"),
        (4, "1–3 GeV"),
        (5, "3–10 GeV"),
        (6, "10–100 GeV"),
        (7, "100 GeV–1 TeV"),
    ]

    source = models.ForeignKey(
        FermiSource,
        on_delete=models.CASCADE,
        related_name="sed_points",
    )
    band = models.SmallIntegerField(choices=BAND_CHOICES)

    # Środek pasma energetycznego (geometryczna średnia granic)
    e_min = models.FloatField(help_text="[MeV]")
    e_max = models.FloatField(help_text="[MeV]")
    e_center = models.FloatField(help_text="sqrt(e_min * e_max) [MeV]")

    # Flux fotonowy
    flux = models.FloatField(null=True, blank=True, help_text="[ph cm⁻² s⁻¹]")
    err_lo = models.FloatField(null=True, blank=True, help_text="dolny błąd (wartość dodatnia)")
    err_hi = models.FloatField(null=True, blank=True, help_text="górny błąd")

    # True jeśli flux <= 0 (górna granica detekcji)
    is_upper_limit = models.BooleanField(default=False)

    class Meta:
        db_table = "fermi_sed_point"
        unique_together = [("source", "band")]
        ordering = ["band"]

    def __str__(self) -> str:
        band_label = dict(self.BAND_CHOICES).get(self.band, "?")
        return f"{self.source.source_name} | {band_label} | {self.flux:.3e}"