import os

from django.conf import settings
from django.core.management import BaseCommand

from fermi.crossmatch import run_crossmatch
from fermi.data_catalogues import fermi, hawc, lhaaso, tevcat
from fermi.data_catalogues.utils import compute_healpix
from fermi.models import CatalogSource

# Maps catalog choice value to (loader_module, needs_fits_file)
LOADERS = [
    (fermi,  True),
    (hawc,   True),
    (lhaaso, True),
    (tevcat, False),
]

# Fields to overwrite on conflict (everything except pk and created_at)
UPDATE_FIELDS = [
    "ra", "dec", "pos_err_deg", "healpix_id",
    "flux", "flux_err", "flux_unit",
    "energy_min_gev", "energy_max_gev", "spectral_index",
    "source_class", "extra",
]


class Command(BaseCommand):
    help = "Load catalog FITS files into the database and run crossmatching."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fits-dir",
            default=getattr(settings, "CATALOG_FITS_DIR", "/data/fits"),
            help="Directory containing catalog FITS files.",
        )
        parser.add_argument(
            "--catalog",
            default=None,
            help="Load only this catalog (e.g. fermi_4fgl). Loads all if omitted.",
        )
        parser.add_argument(
            "--skip-crossmatch",
            action="store_true",
            default=False,
            help="Skip the crossmatch step after loading.",
        )

    def handle(self, *args, **options):
        fits_dir = options["fits_dir"]
        only_catalog = options["catalog"]
        skip_crossmatch = options["skip_crossmatch"]

        for loader_module, needs_fits in LOADERS:
            catalog_name = loader_module.CATALOG

            if only_catalog and catalog_name != only_catalog:
                continue

            if needs_fits:
                fits_path = os.path.join(fits_dir, f"{catalog_name}.fits")
                if not os.path.exists(fits_path):
                    self.stderr.write(
                        f"[{catalog_name}] FITS file not found: {fits_path} — skipping."
                    )
                    continue
                self.stdout.write(f"[{catalog_name}] Loading from {fits_path} ...")
                records = loader_module.load(fits_path)
            else:
                self.stdout.write(f"[{catalog_name}] Fetching from web ...")
                records = loader_module.load()

            self._add_healpix(records)
            self._bulk_upsert(records, catalog_name)

        if not skip_crossmatch:
            self.stdout.write("Running crossmatch ...")
            name_count, pos_count = run_crossmatch()
            self.stdout.write(
                f"Crossmatch complete: {name_count} name matches, {pos_count} position matches."
            )

        self.stdout.write(self.style.SUCCESS("Done."))

    def _add_healpix(self, records: list[dict]) -> None:
        for r in records:
            r["healpix_id"] = compute_healpix(r["ra"], r["dec"])

    def _bulk_upsert(self, records: list[dict], catalog_name: str) -> None:
        objs = [CatalogSource(**r) for r in records]
        result = CatalogSource.objects.bulk_create(
            objs,
            update_conflicts=True,
            unique_fields=["catalog", "source_name"],
            update_fields=UPDATE_FIELDS,
        )
        self.stdout.write(f"[{catalog_name}] Upserted {len(result)} sources.")
