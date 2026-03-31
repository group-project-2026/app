from rest_framework import serializers
from .models.fermi import FermiSource, SedPoint


class SedPointSerializer(serializers.ModelSerializer):
    band_label = serializers.CharField(source="get_band_display", read_only=True)

    class Meta:
        model = SedPoint
        fields = [
            "band",
            "band_label",
            "e_min",
            "e_max",
            "e_center",
            "flux",
            "err_lo",
            "err_hi",
            "is_upper_limit",
        ]


class FermiSourceSerializer(serializers.ModelSerializer):
    sed_points = SedPointSerializer(many=True, read_only=True)

    class Meta:
        model = FermiSource
        fields = [
            "id",
            "source_name",
            "source_class",
            "associated_name",
            "ra",
            "dec",
            "glon",
            "glat",
            "flux1000",
            "flux1000_err",
            "significance",
            "spectral_type",
            "pivot_energy",
            "spectral_index",
            "spectral_index_err",
            "redshift",
            "variability_index",
            "is_variable",
            "flags",
            "has_quality_issues",
            "data_release",
            "sed_points",
        ]


class FermiSourceListSerializer(serializers.ModelSerializer):
    """Lekki serializer do listy źródeł (bez SED points)."""

    class Meta:
        model = FermiSource
        fields = [
            "id",
            "source_name",
            "source_class",
            "associated_name",
            "ra",
            "dec",
            "flux1000",
            "significance",
            "redshift",
            "is_variable",
            "flags",
        ]
