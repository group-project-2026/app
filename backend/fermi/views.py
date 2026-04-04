import requests
from django.db.models import Q
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .data_catalogues.utils import cone_pixels
from .models import CatalogSource, CrossMatch
from .serializers import (
    CatalogSourceDetailSerializer,
    CatalogSourceListSerializer,
    CrossMatchSerializer,
)

MAX_CONE_RADIUS_DEG = 10.0

NED_API_URL = "https://ned.ipac.caltech.edu/api/objsearch"


class CatalogSourceViewSet(
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    queryset = CatalogSource.objects.all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CatalogSourceDetailSerializer
        return CatalogSourceListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        ra = params.get("ra")
        dec = params.get("dec")
        radius = params.get("radius")
        catalog = params.get("catalog")

        if ra is not None or dec is not None or radius is not None:
            if not (ra and dec and radius):
                raise ValidationError(
                    "ra, dec, and radius are all required for a cone search."
                )
            try:
                ra_f = float(ra)
                dec_f = float(dec)
                radius_f = float(radius)
            except ValueError:
                raise ValidationError("ra, dec, and radius must be numeric.")

            if not (0 < radius_f <= MAX_CONE_RADIUS_DEG):
                raise ValidationError(
                    f"radius must be between 0 and {MAX_CONE_RADIUS_DEG} degrees."
                )

            pixels = cone_pixels(ra_f, dec_f, radius_f)
            qs = qs.filter(healpix_id__in=pixels)

        if catalog:
            qs = qs.filter(catalog=catalog)

        return qs

    @action(detail=True, methods=["get"], url_path="crossmatches")
    def crossmatches(self, request, pk=None):
        source = self.get_object()
        matches = (
            CrossMatch.objects.filter(Q(source_a=source) | Q(source_b=source))
            .select_related("source_a", "source_b")
        )
        serializer = CrossMatchSerializer(matches, many=True)
        return Response(serializer.data)


class NEDProxyView(APIView):
    """Live proxy to NASA/IPAC Extragalactic Database cone search.

    Results are normalized to the same shape as CatalogSourceListSerializer
    but are not stored in the database.
    """

    def get(self, request):
        ra = request.query_params.get("ra")
        dec = request.query_params.get("dec")
        radius = request.query_params.get("radius")

        if not (ra and dec and radius):
            raise ValidationError("ra, dec, and radius are required.")

        try:
            ra_f = float(ra)
            dec_f = float(dec)
            radius_f = float(radius)
        except ValueError:
            raise ValidationError("ra, dec, and radius must be numeric.")

        ned_params = {
            "search_type": "Near Position Search",
            "ra": ra_f,
            "dec": dec_f,
            "radius": radius_f * 60,  # NED expects arcminutes
            "out_csys": "Equatorial",
            "out_equinox": "J2000.0",
            "of": "xml_main",
            "nmp_op": "ANY",
            "z_constraint": "Unconstrained",
            "z_value1": "",
            "z_value2": "",
            "z_unit": "z",
            "ot_include": "ANY",
            "in_csys": "Equatorial",
            "in_equinox": "J2000.0",
        }

        try:
            ned_resp = requests.get(NED_API_URL, params=ned_params, timeout=15)
            ned_resp.raise_for_status()
        except requests.RequestException as exc:
            return Response({"error": f"NED API error: {exc}"}, status=502)

        # NED returns XML; parse minimal fields
        results = _parse_ned_xml(ned_resp.text)
        return Response(results)


def _parse_ned_xml(xml_text: str) -> list[dict]:
    """Extract source records from NED XML response."""
    import xml.etree.ElementTree as ET

    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []

    ns = {"ned": "http://ned.ipac.caltech.edu/NEDSchema"}
    records = []

    for obj in root.iter("NED_object"):
        try:
            name = obj.findtext("objname", default="").strip()
            ra = float(obj.findtext("ra", default="0") or 0)
            dec = float(obj.findtext("dec", default="0") or 0)
            obj_type = obj.findtext("type", default="").strip()
        except (TypeError, ValueError):
            continue

        records.append({
            "id": None,
            "catalog": "ned",
            "source_name": name,
            "ra": ra,
            "dec": dec,
            "pos_err_deg": None,
            "flux": None,
            "flux_unit": "",
            "energy_min_gev": None,
            "energy_max_gev": None,
            "source_class": obj_type,
        })

    return records
