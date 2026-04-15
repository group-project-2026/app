from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from sources.models import Source, CatalogEntry
from catalogs.crossmatch import CrossMatchService
from .serializers import (
    SourceDetailSerializer,
    SourceListSerializer,
    CatalogEntrySerializer,
)


class SourceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for astronomical sources.

    Provides endpoints:
    - GET /api/sources/ - List all sources
    - GET /api/sources/{id}/ - Get source details
    - GET /api/sources/region/ - Query by sky region
    - GET /api/sources/filter/ - Search and filter
    """

    queryset = Source.objects.prefetch_related("catalog_entries").order_by(
        "unified_name"
    )
    serializer_class = SourceDetailSerializer
    lookup_field = "id"
    filterset_fields = ["primary_catalog"]
    search_fields = ["unified_name", "catalog_entries__original_name"]
    ordering_fields = ["unified_name", "created_at", "primary_catalog"]

    def get_serializer_class(self):
        """Use lightweight serializer for list views."""
        if self.action == "list":
            return SourceListSerializer
        return SourceDetailSerializer

    @action(detail=False, methods=["get"])
    def region(self, request):
        """
        Query sources within a sky region.

        Parameters:
        - ra: Right Ascension [degrees]
        - dec: Declination [degrees]
        - radius: Search radius [degrees] (default 0.5)

        Example: /api/sources/region/?ra=123.45&dec=-45.67&radius=1.0
        """
        try:
            ra = float(request.query_params.get("ra"))
            dec = float(request.query_params.get("dec"))
            radius = float(request.query_params.get("radius", 0.5))
        except (TypeError, ValueError):
            return Response(
                {"error": "Invalid parameters. Require: ra, dec (floats), radius (optional)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (-90 <= dec <= 90) or not (0 <= ra <= 360):
            return Response(
                {"error": "Invalid coordinates. RA: 0-360, DEC: -90 to 90"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if radius <= 0 or radius > 180:
            return Response(
                {"error": "Radius must be between 0 and 180 degrees"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Perform spatial query
        cross_match = CrossMatchService()
        sources = cross_match.find_nearby(ra, dec, radius)

        serializer = self.get_serializer(sources, many=True)
        return Response(
            {
                "count": sources.count(),
                "ra": ra,
                "dec": dec,
                "radius_deg": radius,
                "results": serializer.data,
            }
        )

    @action(detail=False, methods=["get"])
    def filter(self, request):
        """
        Search and filter sources.

        Parameters:
        - catalog: Filter by catalog name (FERMI, LHAASO, HAWC, etc.)
        - search: Text search in source names
        - min_flux: Filter by minimum flux (if in metadata)
        - confidence: Filter by cross-match confidence (0.0-1.0)

        Example: /api/sources/filter/?catalog=FERMI&search=3C279
        """
        queryset = self.queryset

        # Filter by catalog
        catalog = request.query_params.get("catalog")
        if catalog:
            queryset = queryset.filter(primary_catalog=catalog)

        # Text search
        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(unified_name__icontains=search)
                | Q(catalog_entries__original_name__icontains=search)
            ).distinct()

        # Filter by confidence
        confidence_min = request.query_params.get("confidence_min")
        if confidence_min:
            try:
                confidence_min = float(confidence_min)
                queryset = queryset.filter(
                    catalog_entries__confidence__gte=confidence_min
                ).distinct()
            except ValueError:
                pass

        # Apply pagination and ordering
        queryset = self.filter_queryset(queryset)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def catalog_entries(self, request, id=None):
        """
        Get all catalog entries for a source.

        Example: /api/sources/{id}/catalog_entries/
        """
        source = self.get_object()
        entries = source.catalog_entries.all()
        serializer = CatalogEntrySerializer(entries, many=True)
        return Response(serializer.data)


class CatalogEntryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for catalog entries.

    Provides endpoints:
    - GET /api/catalog-entries/ - List all entries
    - GET /api/catalog-entries/{id}/ - Get entry details
    """

    queryset = CatalogEntry.objects.select_related("source").order_by(
        "catalog_name", "original_name"
    )
    serializer_class = CatalogEntrySerializer
    lookup_field = "id"
    filterset_fields = ["catalog_name", "source"]
    search_fields = ["original_name", "source__unified_name"]
    ordering_fields = ["catalog_name", "original_name", "confidence"]
