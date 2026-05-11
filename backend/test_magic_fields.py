import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings')
django.setup()

from sources.models import CatalogEntry

# Check overall stats
total = CatalogEntry.objects.count()
with_magic = CatalogEntry.objects.exclude(magic_significance__isnull=True).count()
without_magic = total - with_magic

print(f"Database Statistics:")
print(f"  Total entries: {total}")
print(f"  With MAGIC data: {with_magic}")
print(f"  Without MAGIC data: {without_magic}")

# Check a source without MAGIC data
no_magic = CatalogEntry.objects.filter(magic_significance__isnull=True).first()
if no_magic:
    print(f"\nExample source without MAGIC data:")
    print(f"  Name: {no_magic.original_name}")
    print(f"  Catalog: {no_magic.catalog_name}")
    print(f"  magic_significance: {no_magic.magic_significance}")
    print(f"  magic_detectable: {no_magic.magic_detectable}")
    print(f"  ✓ Source saved successfully with None MAGIC fields")

# Check a source with MAGIC data
with_mag = CatalogEntry.objects.exclude(magic_significance__isnull=True).first()
if with_mag:
    print(f"\nExample source with MAGIC data:")
    print(f"  Name: {with_mag.original_name}")
    print(f"  Catalog: {with_mag.catalog_name}")
    print(f"  magic_significance: {with_mag.magic_significance:.2f}σ")
    print(f"  magic_detectable: {with_mag.magic_detectable}")
