from django.core.management import BaseCommand


class Command(BaseCommand):
    help = 'Seeds data from web sources'

    def handle(self, *args, **options):
        ...