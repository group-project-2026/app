from django.core.management import BaseCommand

from fermi.data_catalogues.fermi import FITS_LOCAL, FITS_URL, FermiDataImporter


class CommandError(Exception):
    pass


class Command(BaseCommand):
    help = "Importuje katalog Fermi-LAT 4FGL (FITS) do bazy danych."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fits",
            default=FITS_LOCAL,
            help=f"Ścieżka do pliku FITS (domyślnie: {FITS_LOCAL})",
        )
        parser.add_argument(
            "--url",
            default=FITS_URL,
            help="URL do pobrania pliku FITS jeśli nie istnieje lokalnie",
        )
        parser.add_argument(
            "--batch",
            type=int,
            default=500,
            help="Co ile źródeł logować postęp (domyślnie: 500)",
        )

    def handle(self, *args, **options):
        importer = FermiDataImporter(
            fits_path=options["fits"],
            fits_url=options["url"],
            batch_size=options["batch"],
            stdout=self.stdout,
        )
        try:
            importer.run()
        except Exception as exc:
            raise CommandError(str(exc)) from exc
