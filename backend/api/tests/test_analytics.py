from django.test import TestCase
from rest_framework.test import APIClient


class SourceAnalyticsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_analytics_endpoint_returns_empty_shape(self):
        response = self.client.get("/api/sources/analytics/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["headlineMetrics"]["samples"], 0)
        self.assertEqual(response.data["catalogRows"], [])
        self.assertEqual(response.data["groupingRows"], [])
        self.assertEqual(response.data["emissionTrend"], [])
        self.assertEqual(response.data["availableCatalogs"], [])
