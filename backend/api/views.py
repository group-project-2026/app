import math
from collections import defaultdict

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

    @staticmethod
    def _preferred_entry(source):
        entries = list(source.catalog_entries.all())
        if not entries:
            return None

        for entry in entries:
            if entry.catalog_name == source.primary_catalog:
                return entry

        return entries[0]

    @staticmethod
    def _metadata_float(metadata, key):
        if not isinstance(metadata, dict):
            return None

        raw_value = metadata.get(key)
        if raw_value in (None, ""):
            return None

        try:
            return float(raw_value)
        except (TypeError, ValueError):
            return None

    @classmethod
    def _detectability_score(cls, significance, flux1000, confidence):
        score = 0.0

        if significance is not None:
            score += significance * 5.0

        if flux1000 is not None and flux1000 > 0:
            score += math.log10((flux1000 * 1e13) + 1.0) * 6.0

        if confidence is not None:
            score += confidence * 40.0

        return round(max(0.0, min(100.0, score)), 1)

    @staticmethod
    def _median(values):
        if not values:
            return 0

        ordered = sorted(values)
        middle = len(ordered) // 2
        if len(ordered) % 2 == 0:
            return (ordered[middle - 1] + ordered[middle]) / 2
        return ordered[middle]

    @staticmethod
    def _p95(values):
        if not values:
            return 0

        ordered = sorted(values)
        index = max(0, min(len(ordered) - 1, math.ceil(len(ordered) * 0.95) - 1))
        return ordered[index]

    def _analytics_rows(self, sources):
        rows = []

        for source in sources:
            entry = self._preferred_entry(source)
            metadata = entry.metadata if entry and isinstance(entry.metadata, dict) else {}
            significance = self._metadata_float(metadata, "significance")
            flux1000 = self._metadata_float(metadata, "flux1000")
            confidence = entry.confidence if entry else None

            rows.append(
                {
                    "catalog": source.primary_catalog,
                    "year": source.created_at.year if source.created_at else None,
                    "sourceClass": metadata.get("source_class") or "Unknown",
                    "discoveryMethod": entry.discovery_method if entry and entry.discovery_method else "Unknown",
                    "emissionFlux": flux1000 or 0,
                    "significanceSigma": significance or 0,
                    "detectability": self._detectability_score(
                        significance,
                        flux1000,
                        confidence,
                    ),
                }
            )

        return rows

    def _group_rows(self, rows, group_by):
        groups = defaultdict(list)

        for row in rows:
            if group_by == "year":
                key = str(row["year"]) if row["year"] is not None else "Unknown"
            elif group_by == "sourceClass":
                key = row["sourceClass"] or "Unknown"
            elif group_by == "discoveryMethod":
                key = row["discoveryMethod"] or "Unknown"
            else:
                key = row["catalog"]

            groups[key].append(row)

        result = []
        for group, items in groups.items():
            emissions = [item["emissionFlux"] for item in items]
            significances = [item["significanceSigma"] for item in items]
            detectabilities = [item["detectability"] for item in items]
            high_count = sum(1 for value in detectabilities if value >= 70)

            result.append(
                {
                    "group": group,
                    "sampleCount": len(items),
                    "avgEmissionFlux": round(sum(emissions) / len(emissions), 3) if emissions else 0,
                    "medianEmissionFlux": round(self._median(emissions), 3) if emissions else 0,
                    "avgSignificance": round(sum(significances) / len(significances), 2) if significances else 0,
                    "peakSignificance": round(max(significances), 2) if significances else 0,
                    "avgDetectability": round(sum(detectabilities) / len(detectabilities), 1) if detectabilities else 0,
                    "highDetectabilityShare": round((high_count / len(items)) * 100, 1) if items else 0,
                }
            )

        if group_by == "year":
            result.sort(key=lambda item: item["group"] if item["group"] != "Unknown" else "9999")
        else:
            result.sort(key=lambda item: item["group"])

        return result

    def _catalog_rows(self, rows):
        grouped = defaultdict(list)
        for row in rows:
            grouped[row["catalog"]].append(row)

        catalog_rows = []
        for catalog, items in grouped.items():
            emissions = [item["emissionFlux"] for item in items]
            significances = [item["significanceSigma"] for item in items]
            detectabilities = [item["detectability"] for item in items]
            high_count = sum(1 for value in detectabilities if value >= 70)

            catalog_rows.append(
                {
                    "catalog": catalog,
                    "sampleCount": len(items),
                    "avgEmissionFlux": round(sum(emissions) / len(emissions), 3) if emissions else 0,
                    "peakEmissionFlux": round(max(emissions), 3) if emissions else 0,
                    "avgSignificance": round(sum(significances) / len(significances), 2) if significances else 0,
                    "p95Significance": round(self._p95(significances), 2) if significances else 0,
                    "peakSignificance": round(max(significances), 2) if significances else 0,
                    "avgDetectability": round(sum(detectabilities) / len(detectabilities), 1) if detectabilities else 0,
                    "highDetectabilityShare": round((high_count / len(items)) * 100, 1) if items else 0,
                    "low": sum(1 for value in detectabilities if value < 40),
                    "medium": sum(1 for value in detectabilities if 40 <= value < 70),
                    "high": sum(1 for value in detectabilities if value >= 70),
                }
            )

        catalog_rows.sort(key=lambda item: item["catalog"])
        return catalog_rows

    @action(detail=False, methods=["get"])
    def analytics(self, request):
        queryset = self.queryset
        catalogs = [catalog for catalog in request.query_params.getlist("catalog") if catalog]
        if catalogs:
            queryset = queryset.filter(primary_catalog__in=catalogs)

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(unified_name__icontains=search)
                | Q(catalog_entries__original_name__icontains=search)
            ).distinct()

        sources = list(queryset.prefetch_related("catalog_entries").order_by("primary_catalog", "unified_name"))
        rows = self._analytics_rows(sources)

        if not rows:
            return Response(
                {
                    "headlineMetrics": {"samples": 0, "avgEmissionFlux": 0, "avgSignificance": 0, "avgDetectability": 0, "highDetectabilityShare": 0},
                    "catalogRows": [],
                    "groupingRows": [],
                    "emissionTrend": [],
                    "emissionComparison": [],
                    "significanceComparison": [],
                    "detectabilityComparison": [],
                    "radarComparison": [],
                    "availableCatalogs": [],
                    "groupBy": request.query_params.get("group_by", "catalog"),
                }
            )

        emissions = [row["emissionFlux"] for row in rows]
        significances = [row["significanceSigma"] for row in rows]
        detectabilities = [row["detectability"] for row in rows]

        catalog_rows = self._catalog_rows(rows)
        available_catalogs = [row["catalog"] for row in catalog_rows]
        years = sorted({row["year"] for row in rows if row["year"] is not None})

        emission_trend = []
        for year in years:
            point = {"year": year}
            for catalog in available_catalogs:
                values = [row["emissionFlux"] for row in rows if row["year"] == year and row["catalog"] == catalog]
                point[catalog] = round(sum(values) / len(values), 3) if values else None
            emission_trend.append(point)

        max_emission = max((item["avgEmissionFlux"] for item in catalog_rows), default=0)
        max_significance = max((item["avgSignificance"] for item in catalog_rows), default=0)
        max_detectability = max((item["avgDetectability"] for item in catalog_rows), default=0)

        radar_comparison = []
        for item in catalog_rows:
            radar_comparison.append(
                {
                    "catalog": item["catalog"],
                    "emissionIndex": 0 if max_emission == 0 else round((item["avgEmissionFlux"] / max_emission) * 100, 1),
                    "significanceIndex": 0 if max_significance == 0 else round((item["avgSignificance"] / max_significance) * 100, 1),
                    "detectabilityIndex": 0 if max_detectability == 0 else round((item["avgDetectability"] / max_detectability) * 100, 1),
                    "highDetectabilityShare": item["highDetectabilityShare"],
                }
            )

        return Response(
            {
                "headlineMetrics": {
                    "samples": len(rows),
                    "avgEmissionFlux": round(sum(emissions) / len(emissions), 3) if emissions else 0,
                    "avgSignificance": round(sum(significances) / len(significances), 2) if significances else 0,
                    "avgDetectability": round(sum(detectabilities) / len(detectabilities), 1) if detectabilities else 0,
                    "highDetectabilityShare": round((sum(1 for value in detectabilities if value >= 70) / len(rows)) * 100, 1),
                },
                "catalogRows": catalog_rows,
                "groupingRows": self._group_rows(rows, request.query_params.get("group_by", "catalog")),
                "emissionTrend": emission_trend,
                "emissionComparison": [
                    {"catalog": item["catalog"], "avgEmissionFlux": item["avgEmissionFlux"], "peakEmissionFlux": item["peakEmissionFlux"]}
                    for item in catalog_rows
                ],
                "significanceComparison": [
                    {"catalog": item["catalog"], "avgSignificance": item["avgSignificance"], "p95Significance": item["p95Significance"], "peakSignificance": item["peakSignificance"]}
                    for item in catalog_rows
                ],
                "detectabilityComparison": [
                    {"catalog": item["catalog"], "low": item["low"], "medium": item["medium"], "high": item["high"], "avgDetectability": item["avgDetectability"]}
                    for item in catalog_rows
                ],
                "radarComparison": radar_comparison,
                "availableCatalogs": available_catalogs,
                "groupBy": request.query_params.get("group_by", "catalog"),
            }
        )

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
