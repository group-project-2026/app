import math
from datetime import datetime, time
from collections import defaultdict

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count, Min, Max
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from sources.models import Source, CatalogEntry
from catalogs.crossmatch import CrossMatchService
from .serializers import (
    SourceDetailSerializer,
    SourceListSerializer,
    SourceMapPointSerializer,
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
        if self.action == "analytics_map":
            return SourceMapPointSerializer
        return SourceDetailSerializer

    @staticmethod
    def _parse_date_bound(raw_value, param_name, is_end=False):
        if raw_value in (None, ""):
            return None, None

        parsed = parse_datetime(raw_value)
        if parsed is None:
            date_value = parse_date(raw_value)
            if date_value is None:
                return None, Response(
                    {"error": f"Invalid value for '{
                        param_name}': expected ISO date/datetime"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            parsed = datetime.combine(
                date_value, time.max if is_end else time.min
            )

        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(
                parsed, timezone.get_current_timezone())

        return parsed, None

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
        index = max(0, min(len(ordered) - 1,
                    math.ceil(len(ordered) * 0.95) - 1))
        return ordered[index]

    def _analytics_rows(self, sources):
        rows = []

        for source in sources:
            entry = self._preferred_entry(source)
            metadata = entry.metadata if entry and isinstance(
                entry.metadata, dict) else {}
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
                key = str(
                    row["year"]) if row["year"] is not None else "Unknown"
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
            result.sort(
                key=lambda item: item["group"] if item["group"] != "Unknown" else "9999")
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
        catalogs = [catalog for catalog in request.query_params.getlist(
            "catalog") if catalog]
        if catalogs:
            queryset = queryset.filter(primary_catalog__in=catalogs)

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(unified_name__icontains=search)
                | Q(catalog_entries__original_name__icontains=search)
            ).distinct()

        sources = list(queryset.prefetch_related(
            "catalog_entries").order_by("primary_catalog", "unified_name"))
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
        years = sorted({row["year"]
                       for row in rows if row["year"] is not None})

        emission_trend = []
        for year in years:
            point = {"year": year}
            for catalog in available_catalogs:
                values = [row["emissionFlux"] for row in rows if row["year"]
                          == year and row["catalog"] == catalog]
                point[catalog] = round(
                    sum(values) / len(values), 3) if values else None
            emission_trend.append(point)

        max_emission = max((item["avgEmissionFlux"]
                           for item in catalog_rows), default=0)
        max_significance = max((item["avgSignificance"]
                               for item in catalog_rows), default=0)
        max_detectability = max((item["avgDetectability"]
                                for item in catalog_rows), default=0)

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

            # Build log-spaced histogram for significance per catalog
            def _build_significance_histogram(all_rows, bins=15, min_exp=0, max_exp=4):
                # bins between 10^min_exp and 10^max_exp (inclusive)
                step = (max_exp - min_exp) / bins
                edges = [10 ** (min_exp + i * step) for i in range(bins + 1)]

                # prepare structure: { catalog: { bins: [{min, max, label, count}], total } }
                grouped = defaultdict(list)
                for r in all_rows:
                    sig = r.get("significanceSigma")
                    # ignore missing or non-positive values for log histogram
                    if sig is None or sig <= 0:
                        continue
                    grouped[r.get("catalog")].append(sig)

                result = {}
                for catalog, values in grouped.items():
                    counts = [0] * bins
                    for v in values:
                        # find bin index
                        idx = None
                        for i in range(bins):
                            lo = edges[i]
                            hi = edges[i + 1]
                            if i == bins - 1:
                                if v >= lo and v <= hi:
                                    idx = i
                                    break
                            else:
                                if v >= lo and v < hi:
                                    idx = i
                                    break
                        if idx is None:
                            # if value outside range, skip
                            continue
                        counts[idx] += 1

                    total = len(values)
                    bin_objs = []
                    for i in range(bins):
                        lo = edges[i]
                        hi = edges[i + 1]
                        label = f"{lo:.2g}-{hi:.2g}"
                        bin_objs.append({
                            "min": lo,
                            "max": hi,
                            "label": label,
                            "count": counts[i],
                            "percentage": round((counts[i] / total) * 100, 1) if total > 0 else 0,
                        })

                    result[catalog] = {"bins": bin_objs, "total": total}

                return {"edges": edges, "perCatalog": result}

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
                    {"catalog": item["catalog"], "avgEmissionFlux": item["avgEmissionFlux"],
                        "peakEmissionFlux": item["peakEmissionFlux"]}
                    for item in catalog_rows
                ],
                "significanceComparison": [
                    {"catalog": item["catalog"], "avgSignificance": item["avgSignificance"],
                        "p95Significance": item["p95Significance"], "peakSignificance": item["peakSignificance"]}
                    for item in catalog_rows
                ],
                "detectabilityComparison": [
                    {"catalog": item["catalog"], "low": item["low"], "medium": item["medium"],
                        "high": item["high"], "avgDetectability": item["avgDetectability"]}
                    for item in catalog_rows
                ],
                "radarComparison": radar_comparison,
                "significanceHistogram": _build_significance_histogram(rows),
                "availableCatalogs": available_catalogs,
                "groupBy": request.query_params.get("group_by", "catalog"),
            }
        )

    @action(detail=False, methods=["get"])
    def analytics_map(self, request):
        """
        Return map-ready source points with filter metadata.

        Parameters:
        - catalog: Repeatable catalog filter
        - search: Text search in source names
        - ra_min, ra_max: RA bounds [0..360]
        - dec_min, dec_max: DEC bounds [-90..90]
        - significance_min, significance_max: Metadata significance bounds
        - flux_min, flux_max: Metadata flux1000 bounds
        - discovery_date_start, discovery_date_end: ISO date/datetime bounds
        - ra, dec, radius: Optional circular region filter in sky coordinates
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

        catalogs = [catalog for catalog in params.getlist(
            "catalog") if catalog]
        if catalogs:
            queryset = queryset.filter(primary_catalog__in=catalogs)

        search = params.get("search")
        if search:
            queryset = queryset.filter(
                Q(unified_name__icontains=search)
                | Q(catalog_entries__original_name__icontains=search)
            ).distinct()

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

        if (
            ra_min is not None
            and ra_max is not None
            and ra_min > ra_max
        ):
            return Response(
                {"error": "'ra_min' must be <= 'ra_max'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            dec_min is not None
            and dec_max is not None
            and dec_min > dec_max
        ):
            return Response(
                {"error": "'dec_min' must be <= 'dec_max'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if ra_min is not None:
            queryset = queryset.filter(ra__gte=ra_min)
        if ra_max is not None:
            queryset = queryset.filter(ra__lte=ra_max)
        if dec_min is not None:
            queryset = queryset.filter(dec__gte=dec_min)
        if dec_max is not None:
            queryset = queryset.filter(dec__lte=dec_max)

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

        if (
            significance_min is not None
            and significance_max is not None
            and significance_min > significance_max
        ):
            return Response(
                {"error": "'significance_min' must be <= 'significance_max'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if flux_min is not None and flux_max is not None and flux_min > flux_max:
            return Response(
                {"error": "'flux_min' must be <= 'flux_max'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if significance_min is not None:
            queryset = queryset.filter(
                catalog_entries__metadata__significance__gte=significance_min
            )
        if significance_max is not None:
            queryset = queryset.filter(
                catalog_entries__metadata__significance__lte=significance_max
            )
        if flux_min is not None:
            queryset = queryset.filter(
                catalog_entries__metadata__flux1000__gte=flux_min)
        if flux_max is not None:
            queryset = queryset.filter(
                catalog_entries__metadata__flux1000__lte=flux_max)

        discovery_start_raw = params.get("discovery_date_start")
        discovery_end_raw = params.get("discovery_date_end")
        discovery_start, error = self._parse_date_bound(
            discovery_start_raw,
            "discovery_date_start",
            is_end=False,
        )
        if error:
            return error
        discovery_end, error = self._parse_date_bound(
            discovery_end_raw,
            "discovery_date_end",
            is_end=True,
        )
        if error:
            return error

        if (
            discovery_start is not None
            and discovery_end is not None
            and discovery_start > discovery_end
        ):
            return Response(
                {"error": "'discovery_date_start' must be <= 'discovery_date_end'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if discovery_start is not None:
            queryset = queryset.filter(discovery_date__gte=discovery_start)
        if discovery_end is not None:
            queryset = queryset.filter(discovery_date__lte=discovery_end)

        radius = params.get("radius")
        if radius not in (None, ""):
            ra_center, error = parse_float("ra", 0, 360)
            if error:
                return error
            dec_center, error = parse_float("dec", -90, 90)
            if error:
                return error
            radius_value, error = parse_float("radius", 0.0000001, 180)
            if error:
                return error

            if ra_center is None or dec_center is None:
                return Response(
                    {"error": "'ra' and 'dec' are required when 'radius' is set"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            cross_match = CrossMatchService()
            nearby_ids = list(
                cross_match.find_nearby(ra_center, dec_center, radius_value).values_list(
                    "id", flat=True
                )
            )
            queryset = queryset.filter(id__in=nearby_ids)

        queryset = queryset.distinct().order_by("primary_catalog", "unified_name")

        filtered_sources = queryset
        bounds = filtered_sources.aggregate(
            ra_min=Min("ra"),
            ra_max=Max("ra"),
            dec_min=Min("dec"),
            dec_max=Max("dec"),
            discovery_date_min=Min("discovery_date"),
            discovery_date_max=Max("discovery_date"),
        )
        catalog_distribution = {
            item["primary_catalog"]: item["count"]
            for item in filtered_sources.values("primary_catalog")
            .annotate(count=Count("id"))
            .order_by("primary_catalog")
        }

        page = self.paginate_queryset(filtered_sources)
        serializer = self.get_serializer(
            page if page is not None else filtered_sources, many=True)

        spatial_bounds = {
            "raMin": bounds["ra_min"],
            "raMax": bounds["ra_max"],
            "decMin": bounds["dec_min"],
            "decMax": bounds["dec_max"],
        }
        date_bounds = {
            "start": bounds["discovery_date_min"],
            "end": bounds["discovery_date_max"],
        }
        filters_applied = {
            "catalogs": catalogs,
            "search": search,
            "raMin": ra_min,
            "raMax": ra_max,
            "decMin": dec_min,
            "decMax": dec_max,
            "significanceMin": significance_min,
            "significanceMax": significance_max,
            "fluxMin": flux_min,
            "fluxMax": flux_max,
            "discoveryDateStart": discovery_start_raw,
            "discoveryDateEnd": discovery_end_raw,
            "ra": params.get("ra"),
            "dec": params.get("dec"),
            "radius": radius,
        }

        if page is not None:
            response = self.get_paginated_response(serializer.data)
            response.data["spatialBounds"] = spatial_bounds
            response.data["dateBounds"] = date_bounds
            response.data["catalogDistribution"] = catalog_distribution
            response.data["filtersApplied"] = filters_applied
            return response

        return Response(
            {
                "count": len(serializer.data),
                "next": None,
                "previous": None,
                "results": serializer.data,
                "spatialBounds": spatial_bounds,
                "dateBounds": date_bounds,
                "catalogDistribution": catalog_distribution,
                "filtersApplied": filters_applied,
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
        catalogs = [catalog for catalog in params.getlist(
            "catalog") if catalog]
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
            queryset = queryset.filter(
                catalog_entries__confidence__gte=confidence_min)
        if confidence_max is not None:
            queryset = queryset.filter(
                catalog_entries__confidence__lte=confidence_max)

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
            queryset = queryset.filter(
                catalog_entries__metadata__flux1000__gte=flux_min)
        if flux_max is not None:
            queryset = queryset.filter(
                catalog_entries__metadata__flux1000__lte=flux_max)

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

    @action(detail=True, methods=["get"])
    def magic_simulation(self, request, id=None):
        """
        Run MAGIC source simulator with configurable observation parameters,
        or return pre-calculated MAGIC data if available.

        Returns raw simulation data (energy bins, spectral points, aggregate stats)
        suitable for plotting on the frontend.

        Query Parameters (all optional):
        - zenith_angle: 'low' (0-30°), 'mid' (30-45°), 'high' (~60°) [default: low]
        - observation_time_hours: float, hours of observation [default: 20]
        - psf_deg: float, point spread function size in degrees [default: 0.1]
        - extension_deg: float, source extension radius in degrees [default: 0.0]
        - offset_degrad: float, performance degradation for off-axis (0-1] [default: 1.0]
        - num_off_regions: int, background estimation regions [default: 3]
        - min_events: int, minimum excess events for detection [default: 10]
        - min_sbr: float, minimum signal-to-background ratio [default: 0.05]

        Returns:
        - Full simulation if all parameters valid and spectrum available
        - Pre-calculated MAGIC data if available but no spectrum found
        - 400 error if no spectral data and no pre-calculated results available

        Example: /api/sources/123/magic-simulation/?zenith_angle=mid&observation_time_hours=50
        """
        from catalogs.mss_wrapper import build_spectrum_from_catalog, run_mss_simulation

        source = self.get_object()

        # Get primary catalog entry
        try:
            primary_entry = source.catalog_entries.get(
                catalog_name=source.primary_catalog
            )
        except CatalogEntry.DoesNotExist:
            return Response(
                {"error": f"No catalog entry for primary catalog {source.primary_catalog}"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Try to extract spectrum from catalog metadata
        spectrum_func = build_spectrum_from_catalog(primary_entry.metadata)
        
        if spectrum_func is None:
            # No spectrum available - return pre-calculated MAGIC data if exists
            if primary_entry.magic_significance is not None:
                return Response({
                    "source": {
                        "id": source.id,
                        "unified_name": source.unified_name,
                        "ra": source.ra,
                        "dec": source.dec,
                        "primary_catalog": source.primary_catalog,
                    },
                    "catalog_entry": {
                        "original_name": primary_entry.original_name,
                        "catalog_name": primary_entry.catalog_name,
                        "confidence": primary_entry.confidence,
                        "discovery_method": primary_entry.discovery_method,
                    },
                    "pre_calculated_magic": {
                        "magic_significance": primary_entry.magic_significance,
                        "magic_detectable": primary_entry.magic_detectable,
                        "magic_calculated_at": primary_entry.magic_calculated_at,
                        "observation_params": {
                            "observation_time_hours": 20,
                            "zenith_angle": "low",
                            "note": "Default parameters used during catalog ingestion"
                        }
                    },
                    "note": "Spectral data incomplete for on-demand calculation. Showing pre-calculated results from catalog ingestion."
                })
            else:
                # No spectrum and no pre-calculated data
                return Response(
                    {"error": "Source lacks complete spectral data (need spectral_index and flux) and has no pre-calculated MAGIC statistics."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Parse query parameters with defaults and validation
        def parse_param(param_name, param_type=float, default=None, min_val=None, max_val=None):
            raw = request.query_params.get(param_name)
            if raw is None or raw == "":
                return default, None

            try:
                value = param_type(raw)
            except (TypeError, ValueError):
                return None, Response(
                    {"error": f"Invalid '{param_name}': expected {param_type.__name__}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if min_val is not None and value < min_val:
                return None, Response(
                    {"error": f"'{param_name}' must be >= {min_val}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if max_val is not None and value > max_val:
                return None, Response(
                    {"error": f"'{param_name}' must be <= {max_val}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            return value, None

        # Parse observation parameters
        zenith_angle, error = parse_param("zenith_angle", str, "low")
        if error:
            return error

        if zenith_angle not in ("low", "mid", "high"):
            return Response(
                {"error": "zenith_angle must be 'low', 'mid', or 'high'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        observation_time_hours, error = parse_param(
            "observation_time_hours", float, 20.0, min_val=0.1, max_val=10000
        )
        if error:
            return error

        psf_deg, error = parse_param(
            "psf_deg", float, 0.1, min_val=0.0, max_val=1.0
        )
        if error:
            return error

        extension_deg, error = parse_param(
            "extension_deg", float, 0.0, min_val=0.0, max_val=1.0
        )
        if error:
            return error

        offset_degrad, error = parse_param(
            "offset_degrad", float, 1.0, min_val=0.01, max_val=1.0
        )
        if error:
            return error

        num_off_regions, error = parse_param(
            "num_off_regions", int, 3, min_val=1, max_val=7
        )
        if error:
            return error

        min_events, error = parse_param(
            "min_events", int, 10, min_val=1, max_val=1000
        )
        if error:
            return error

        min_sbr, error = parse_param(
            "min_sbr", float, 0.05, min_val=0.0, max_val=1.0
        )
        if error:
            return error

        # Run simulation
        try:
            import math
            import numpy as np
            
            results = run_mss_simulation(
                spectrum_func=spectrum_func,
                observation_time_hours=observation_time_hours,
                zenith_angle=zenith_angle,
                psf_deg=psf_deg,
                extension_deg=extension_deg,
                offset_degrad=offset_degrad,
                num_off_regions=num_off_regions,
                min_events=min_events,
                min_sbr=min_sbr,
            )

            # Helper function to convert non-JSON-serializable values
            def make_json_serializable(obj):
                """Convert numpy arrays and NaN values to JSON-serializable types."""
                if isinstance(obj, dict):
                    return {k: make_json_serializable(v) for k, v in obj.items()}
                elif isinstance(obj, (list, tuple)):
                    return [make_json_serializable(item) for item in obj]
                elif isinstance(obj, np.ndarray):
                    return obj.tolist()
                elif isinstance(obj, (np.floating, float)):
                    if math.isnan(obj) or math.isinf(obj):
                        return None
                    return float(obj)
                elif isinstance(obj, (np.integer, int)):
                    return int(obj)
                else:
                    return obj

            # Convert results to JSON-serializable format
            results = make_json_serializable(results)

            # Augment results with source information
            results["source"] = {
                "id": source.id,
                "unified_name": source.unified_name,
                "ra": source.ra,
                "dec": source.dec,
                "primary_catalog": source.primary_catalog,
            }

            # Add primary catalog entry info
            results["catalog_entry"] = {
                "original_name": primary_entry.original_name,
                "catalog_name": primary_entry.catalog_name,
                "confidence": primary_entry.confidence,
                "discovery_method": primary_entry.discovery_method,
            }

            return Response(results)

        except Exception as e:
            return Response(
                {"error": f"Simulation failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


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
