from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from sources.models import Source, CatalogEntry


class SourceAnalyticsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.source_fermi = Source.objects.create(
            unified_name="J0001+0001",
            ra=12.5,
            dec=3.2,
            primary_catalog="FERMI",
            discovery_date=timezone.now(),
        )
        CatalogEntry.objects.create(
            source=self.source_fermi,
            catalog_name="FERMI",
            original_name="4FGL J0001+0001",
            metadata={"significance": 22.5, "flux1000": 1.2e-9, "source_class": "BLL"},
            discovery_method="gamma-ray",
            confidence=0.93,
        )

        self.source_hawc = Source.objects.create(
            unified_name="J0100-0500",
            ra=15.0,
            dec=-5.0,
            primary_catalog="HAWC",
            discovery_date=timezone.now() - timedelta(days=600),
        )
        CatalogEntry.objects.create(
            source=self.source_hawc,
            catalog_name="HAWC",
            original_name="HAWC J0100-0500",
            metadata={"significance": 8.1, "flux1000": 2.5e-10, "source_class": "Unknown"},
            discovery_method="survey",
            confidence=0.71,
        )

    def test_analytics_endpoint_returns_empty_shape(self):
        Source.objects.all().delete()
        response = self.client.get("/api/sources/analytics/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["headlineMetrics"]["samples"], 0)
        self.assertEqual(response.data["catalogRows"], [])
        self.assertEqual(response.data["groupingRows"], [])
        self.assertEqual(response.data["emissionTrend"], [])
        self.assertEqual(response.data["availableCatalogs"], [])

    def test_analytics_map_returns_metadata_and_results(self):
        response = self.client.get("/api/sources/analytics_map/?catalog=FERMI&page_size=100")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["catalogDistribution"]["FERMI"], 1)
        self.assertEqual(response.data["results"][0]["unified_name"], "J0001+0001")
        self.assertIn("spatialBounds", response.data)
        self.assertIn("dateBounds", response.data)

    def test_analytics_map_rejects_invalid_coordinate_range(self):
        response = self.client.get("/api/sources/analytics_map/?ra_min=100&ra_max=50")

        self.assertEqual(response.status_code, 400)
        self.assertIn("ra_min", response.data["error"])

    def test_analytics_map_filters_by_significance_and_flux(self):
        response = self.client.get(
            "/api/sources/analytics_map/?significance_min=10&flux_min=1e-9&page_size=100"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["primary_catalog"], "FERMI")

    def test_analytics_map_filters_by_discovery_date_range(self):
        start = (timezone.now() - timedelta(days=10)).date().isoformat()
        end = timezone.now().date().isoformat()

        response = self.client.get(
            f"/api/sources/analytics_map/?discovery_date_start={start}&discovery_date_end={end}&page_size=100"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["unified_name"], "J0001+0001")
