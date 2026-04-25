from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count

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
        if self.action in ("list", "filter"):
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
        - catalog: Repeatable catalog filter (e.g. ?catalog=FERMI&catalog=LHAASO)
        - search: Text search in source names
        - source_class: Repeatable source class filter (metadata source_class)
        - ra_min, ra_max: RA bounds [0..360]
        - dec_min, dec_max: DEC bounds [-90..90]
        - confidence_min, confidence_max: Catalog-entry confidence bounds [0..1]
        - significance_min, significance_max: Metadata significance bounds
        - flux_min, flux_max: Metadata flux1000 bounds
        - min_catalog_count: Minimum count of linked catalog entries

        Example: /api/sources/filter/?catalog=FERMI&search=3C279
        """
        queryset = self.queryset
        params = request.query_params

        def parse_float(name, min_value=None, max_value=None):
            raw = params.get(name)
            if raw in (None, ""):
                return None, None
            try:
                value = float(raw)
            except (TypeError, ValueError):
                return None, Response(
                    {"error": f"Invalid value for '{name}': expected float"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if min_value is not None and value < min_value:
                return None, Response(
                    {"error": f"'{name}' must be >= {min_value}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if max_value is not None and value > max_value:
                return None, Response(
                    {"error": f"'{name}' must be <= {max_value}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return value, None

        # Filter by catalog
        catalogs = [catalog for catalog in params.getlist("catalog") if catalog]
        if catalogs:
            queryset = queryset.filter(primary_catalog__in=catalogs)

        # Text search
        search = params.get("search")
        if search:
            queryset = queryset.filter(
                Q(unified_name__icontains=search)
                | Q(catalog_entries__original_name__icontains=search)
            ).distinct()

        # Filter by source class from catalog-entry metadata
        source_classes = [
            source_class for source_class in params.getlist("source_class") if source_class
        ]
        if source_classes:
            source_class_filter = Q()
            for source_class in source_classes:
                source_class_filter |= Q(
                    catalog_entries__metadata__source_class__iexact=source_class
                )
            queryset = queryset.filter(source_class_filter).distinct()

        # Coordinate filters
        ra_min, error = parse_float("ra_min", 0, 360)
        if error:
            return error
        ra_max, error = parse_float("ra_max", 0, 360)
        if error:
            return error
        dec_min, error = parse_float("dec_min", -90, 90)
        if error:
            return error
        dec_max, error = parse_float("dec_max", -90, 90)
        if error:
            return error

        if ra_min is not None:
            queryset = queryset.filter(ra__gte=ra_min)
        if ra_max is not None:
            queryset = queryset.filter(ra__lte=ra_max)
        if dec_min is not None:
            queryset = queryset.filter(dec__gte=dec_min)
        if dec_max is not None:
            queryset = queryset.filter(dec__lte=dec_max)

        # Confidence filters
        confidence_min, error = parse_float("confidence_min", 0, 1)
        if error:
            return error
        confidence_max, error = parse_float("confidence_max", 0, 1)
        if error:
            return error
        if confidence_min is not None and confidence_max is not None:
            if confidence_min > confidence_max:
                return Response(
                    {"error": "'confidence_min' must be <= 'confidence_max'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if confidence_min is not None:
            queryset = queryset.filter(catalog_entries__confidence__gte=confidence_min)
        if confidence_max is not None:
            queryset = queryset.filter(catalog_entries__confidence__lte=confidence_max)

        # Metadata numeric filters
        significance_min, error = parse_float("significance_min")
        if error:
            return error
        significance_max, error = parse_float("significance_max")
        if error:
            return error
        flux_min, error = parse_float("flux_min")
        if error:
            return error
        flux_max, error = parse_float("flux_max")
        if error:
            return error

        if significance_min is not None:
            queryset = queryset.filter(
                catalog_entries__metadata__significance__gte=significance_min
            )
        if significance_max is not None:
            queryset = queryset.filter(
                catalog_entries__metadata__significance__lte=significance_max
            )
        if flux_min is not None:
            queryset = queryset.filter(catalog_entries__metadata__flux1000__gte=flux_min)
        if flux_max is not None:
            queryset = queryset.filter(catalog_entries__metadata__flux1000__lte=flux_max)

        # Minimum number of catalog entries per source
        min_catalog_count_raw = params.get("min_catalog_count")
        if min_catalog_count_raw not in (None, ""):
            try:
                min_catalog_count = int(min_catalog_count_raw)
            except (TypeError, ValueError):
                return Response(
                    {"error": "Invalid value for 'min_catalog_count': expected integer"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if min_catalog_count < 1:
                return Response(
                    {"error": "'min_catalog_count' must be >= 1"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.annotate(
                catalog_count=Count("catalog_entries", distinct=True)
            ).filter(catalog_count__gte=min_catalog_count)

        queryset = queryset.distinct()

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
