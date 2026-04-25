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
    avg_confidence = serializers.SerializerMethodField()
    best_confidence = serializers.SerializerMethodField()
    source_class = serializers.SerializerMethodField()
    significance = serializers.SerializerMethodField()
    flux1000 = serializers.SerializerMethodField()
    spectral_index = serializers.SerializerMethodField()
    associated_name = serializers.SerializerMethodField()
    discovery_method = serializers.SerializerMethodField()

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
            "avg_confidence",
            "best_confidence",
            "source_class",
            "significance",
            "flux1000",
            "spectral_index",
            "associated_name",
            "discovery_method",
        ]
        read_only_fields = fields

    def get_catalog_count(self, obj):
        """Return number of catalogs this source appears in."""
        return obj.catalog_entries.count()

    def _get_preferred_entry(self, obj):
        """
        Prefer entry from source.primary_catalog; otherwise first available entry.
        """
        entries = list(obj.catalog_entries.all())
        if not entries:
            return None
        for entry in entries:
            if entry.catalog_name == obj.primary_catalog:
                return entry
        return entries[0]

    def _metadata_value(self, obj, key):
        entry = self._get_preferred_entry(obj)
        if not entry or not isinstance(entry.metadata, dict):
            return None
        return entry.metadata.get(key)

    def get_avg_confidence(self, obj):
        entries = list(obj.catalog_entries.all())
        if not entries:
            return None
        return sum(entry.confidence for entry in entries) / len(entries)

    def get_best_confidence(self, obj):
        entries = list(obj.catalog_entries.all())
        if not entries:
            return None
        return max(entry.confidence for entry in entries)

    def get_source_class(self, obj):
        return self._metadata_value(obj, "source_class")

    def get_significance(self, obj):
        return self._metadata_value(obj, "significance")

    def get_flux1000(self, obj):
        return self._metadata_value(obj, "flux1000")

    def get_spectral_index(self, obj):
        return self._metadata_value(obj, "spectral_index")

    def get_associated_name(self, obj):
        return self._metadata_value(obj, "associated_name")

    def get_discovery_method(self, obj):
        entry = self._get_preferred_entry(obj)
        return entry.discovery_method if entry else None
