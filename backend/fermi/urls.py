from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CatalogSourceViewSet, NEDProxyView

router = DefaultRouter()
router.register(r"sources", CatalogSourceViewSet, basename="source")

urlpatterns = [
    path("api/", include(router.urls)),
    path("api/sources/ned/", NEDProxyView.as_view(), name="ned-proxy"),
]
