from rest_framework import serializers

from .models import CatalogSource, CrossMatch


class CatalogSourceListSerializer(serializers.ModelSerializer):
    """Compact form used in list and cone-search results."""

    class Meta:
        model = CatalogSource
        fields = [
            "id",
            "catalog",
            "source_name",
            "ra",
            "dec",
            "pos_err_deg",
            "flux",
            "flux_unit",
            "energy_min_gev",
            "energy_max_gev",
            "source_class",
        ]


class CatalogSourceDetailSerializer(serializers.ModelSerializer):
    """Full form including catalog-specific extra fields."""

    class Meta:
        model = CatalogSource
        fields = "__all__"


class CrossMatchSerializer(serializers.ModelSerializer):
    source_a = CatalogSourceListSerializer(read_only=True)
    source_b = CatalogSourceListSerializer(read_only=True)

    class Meta:
        model = CrossMatch
        fields = [
            "id",
            "source_a",
            "source_b",
            "separation_deg",
            "method",
            "confidence",
        ]
