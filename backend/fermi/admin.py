from django.contrib import admin

from .models import CatalogSource, CrossMatch


@admin.register(CatalogSource)
class CatalogSourceAdmin(admin.ModelAdmin):
    list_display = ["source_name", "catalog", "ra", "dec", "source_class"]
    list_filter = ["catalog", "source_class"]
    search_fields = ["source_name"]


@admin.register(CrossMatch)
class CrossMatchAdmin(admin.ModelAdmin):
    list_display = ["source_a", "source_b", "separation_deg", "method", "confidence"]
    list_filter = ["method"]
