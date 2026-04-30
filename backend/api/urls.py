from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import SourceViewSet, CatalogEntryViewSet

router = DefaultRouter()
router.register(r"sources", SourceViewSet, basename="source")
router.register(r"catalog-entries", CatalogEntryViewSet, basename="catalog-entry")

urlpatterns = [
    path("", include(router.urls)),
]
