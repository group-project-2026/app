import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings')
django.setup()

from django.test import Client
from sources.models import Source, CatalogEntry

# Create test client
client = Client()

# Find a source WITH MAGIC data
with_magic = CatalogEntry.objects.exclude(magic_significance__isnull=True).first()
if with_magic:
    source_id = with_magic.source.id
    print(f"Testing source WITH MAGIC data (ID={source_id}):")
    print(f"  Name: {with_magic.original_name}")
    print(f"  Existing MAGIC significance: {with_magic.magic_significance:.2f}σ")
    
    # Test the API endpoint
    response = client.get(f'/api/sources/{source_id}/magic-simulation/')
    if response.status_code == 200:
        data = response.json()
        print(f"  ✓ API returned 200 OK")
        print(f"  Response keys: {list(data.keys())}")
        if 'aggregate_stats' in data:
            print(f"  New simulation significance: {data['aggregate_stats']['total_significance']:.2f}σ")
    else:
        print(f"  ✗ API returned {response.status_code}: {response.content}")

# Find a source WITHOUT MAGIC data
no_magic = CatalogEntry.objects.filter(magic_significance__isnull=True).first()
if no_magic:
    source_id = no_magic.source.id
    print(f"\nTesting source WITHOUT MAGIC data (ID={source_id}):")
    print(f"  Name: {no_magic.original_name}")
    print(f"  Existing MAGIC fields: all None")
    
    # Test the API endpoint
    response = client.get(f'/api/sources/{source_id}/magic-simulation/')
    if response.status_code == 400:
        data = response.json()
        print(f"  ✓ API correctly returned 400 Bad Request")
        print(f"  Error message: {data.get('error', 'N/A')}")
    elif response.status_code == 200:
        data = response.json()
        print(f"  ✓ API returned 200 OK with pre-calculated data")
        if 'pre_calculated_magic' in data:
            print(f"  Returned pre-calculated MAGIC data (if available)")
    else:
        print(f"  ✗ API returned {response.status_code}: {response.content}")
