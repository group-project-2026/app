from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalogs.loaders import LoaderFactory
from catalogs.crossmatch import CrossMatchService


class Command(BaseCommand):
    help = "Ingest astronomical catalog data with cross-matching"

    def add_arguments(self, parser):
        parser.add_argument(
            "--catalogs",
            nargs="+",
            default=["FERMI", "LHAASO", "HAWC"],
            help="Catalog names to ingest (FERMI, LHAASO, HAWC, TEVCAT, NED)",
        )
        parser.add_argument(
            "--match-radius",
            type=float,
            default=0.1,
            help="Matching radius in degrees (default 0.1)",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear all sources before ingesting",
        )

    def handle(self, *args, **options):
        catalogs = options.get("catalogs", ["FERMI"])
        match_radius = options.get("match_radius", 0.1)
        clear = options.get("clear", False)

        if clear:
            from sources.models import Source

            count = Source.objects.count()
            Source.objects.all().delete()
            self.stdout.write(f"[!] Cleared {count} existing sources")

        cross_match = CrossMatchService(match_radius_deg=match_radius)

        for catalog_name in catalogs:
            self._ingest_catalog(catalog_name, cross_match)

    def _ingest_catalog(self, catalog_name: str, cross_match: CrossMatchService):
        """Load and ingest a single catalog."""
        try:
            loader = LoaderFactory.create(catalog_name)
        except ValueError as e:
            self.stderr.write(self.style.ERROR(f"[✗] {e}"))
            return

        self.stdout.write(f"[→] Loading {catalog_name}...")

        try:
            sources_data = loader.load()
        except Exception as e:
            self.stderr.write(
                self.style.ERROR(f"[✗] Error loading {catalog_name}: {e}")
            )
            return

        if not sources_data:
            self.stdout.write(f"[!] No sources found in {catalog_name}")
            return

        self.stdout.write(f"    Found {len(sources_data)} sources")

        # Perform cross-matching with transaction
        with transaction.atomic():
            created_count, matched_count = cross_match.batch_match(
                sources_data, catalog_name
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"[✓] {catalog_name}: {created_count} new, {matched_count} cross-matched"
            )
        )
