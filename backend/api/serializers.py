from rest_framework import serializers
from sources.models import Source, CatalogEntry


class CatalogEntrySerializer(serializers.ModelSerializer):
    """Serializer for individual catalog entries linked to a Source."""

    class Meta:
        model = CatalogEntry
        fields = [
            "id",
            "catalog_name",
            "original_name",
            "metadata",
            "discovery_method",
            "confidence",
            "last_verified",
        ]
        read_only_fields = ["id", "last_verified"]


class SourceDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Source including all catalog entries."""

    catalog_entries = CatalogEntrySerializer(many=True, read_only=True)
    distance = serializers.SerializerMethodField()

    class Meta:
        model = Source
        fields = [
            "id",
            "unified_name",
            "ra",
            "dec",
            "primary_catalog",
            "discovery_date",
            "created_at",
            "updated_at",
            "catalog_entries",
            "distance",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "catalog_entries",
        ]

    def get_distance(self, obj):
        """
        Return distance if annotated from spatial query.
        Otherwise return None.

        Distance is returned in degrees (for SRID 4326) or as a float value.
        """
        if hasattr(obj, "distance") and obj.distance is not None:
            distance = obj.distance
            # Handle both Distance objects and float values
            if hasattr(distance, "deg"):
                return distance.deg
            elif isinstance(distance, (int, float)):
                return float(distance)
        return None


class SourceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Source listing."""

    catalog_count = serializers.SerializerMethodField()

    class Meta:
        model = Source
        fields = [
            "id",
            "unified_name",
            "ra",
            "dec",
            "primary_catalog",
            "created_at",
            "catalog_count",
        ]
        read_only_fields = ["id", "created_at", "catalog_count"]

    def get_catalog_count(self, obj):
        """Return number of catalogs this source appears in."""
        return obj.catalog_entries.count()
