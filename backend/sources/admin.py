from django.contrib import admin
from .models import Source, CatalogEntry


class CatalogEntryInline(admin.TabularInline):
    model = CatalogEntry
    extra = 0
    fields = ("catalog_name", "original_name", "confidence", "discovery_method")
    readonly_fields = ("last_verified",)


@admin.register(Source)
class SourceAdmin(admin.ModelAdmin):
    list_display = (
        "unified_name",
        "ra",
        "dec",
        "primary_catalog",
        "catalog_count",
    )
    list_filter = ("primary_catalog", "created_at")
    search_fields = ("unified_name",)
    readonly_fields = ("created_at", "updated_at", "position")
    fieldsets = (
        (
            "Identification",
            {"fields": ("unified_name", "primary_catalog", "discovery_date")},
        ),
        ("Position", {"fields": ("ra", "dec", "position")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )
    inlines = [CatalogEntryInline]

    def catalog_count(self, obj):
        return obj.catalog_entries.count()

    catalog_count.short_description = "Catalogs"


@admin.register(CatalogEntry)
class CatalogEntryAdmin(admin.ModelAdmin):
    list_display = (
        "source",
        "catalog_name",
        "original_name",
        "confidence",
        "last_verified",
    )
    list_filter = ("catalog_name", "confidence")
    search_fields = ("original_name", "source__unified_name")
    readonly_fields = ("last_verified",)
