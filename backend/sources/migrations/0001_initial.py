# Generated migration for sources app

from django.db import migrations, models
import django.db.models.deletion
import django.contrib.gis.db.models.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Source',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('unified_name', models.CharField(db_index=True, help_text='Unified name for this source across catalogs', max_length=128, unique=True)),
                ('ra', models.FloatField(help_text='Right Ascension J2000 [degrees]')),
                ('dec', models.FloatField(help_text='Declination J2000 [degrees]')),
                ('position', django.contrib.gis.db.models.fields.PointField(help_text='Geographic point (RA, DEC) for spatial queries', srid=4326)),
                ('discovery_date', models.DateTimeField(blank=True, help_text='Date of discovery or first observation', null=True)),
                ('primary_catalog', models.CharField(choices=[('FERMI', 'Fermi-LAT'), ('LHAASO', 'LHAASO'), ('HAWC', 'HAWC'), ('TEVCAT', 'TeVCat'), ('NED', 'NASA Extragalactic Database')], help_text='Catalog with most recent/authoritative data', max_length=16)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'sources_source',
                'ordering': ['unified_name'],
            },
        ),
        migrations.CreateModel(
            name='CatalogEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('catalog_name', models.CharField(choices=[('FERMI', 'Fermi-LAT'), ('LHAASO', 'LHAASO'), ('HAWC', 'HAWC'), ('TEVCAT', 'TeVCat'), ('NED', 'NASA Extragalactic Database')], db_index=True, help_text='Source catalog', max_length=16)),
                ('original_name', models.CharField(help_text='Source name in original catalog', max_length=128)),
                ('metadata', models.JSONField(default=dict, help_text='Catalog-specific data (flux, spectrum, classification, etc.)')),
                ('discovery_method', models.CharField(blank=True, help_text='Detection method (e.g., \'gamma-ray\', \'X-ray\')', max_length=64)),
                ('confidence', models.FloatField(default=1.0, help_text='Cross-match confidence (0.0-1.0)')),
                ('last_verified', models.DateTimeField(auto_now=True)),
                ('source', models.ForeignKey(help_text='Link to unified Source', on_delete=django.db.models.deletion.CASCADE, related_name='catalog_entries', to='sources.source')),
            ],
            options={
                'db_table': 'sources_catalog_entry',
                'ordering': ['catalog_name', 'original_name'],
                'unique_together': {('catalog_name', 'original_name')},
            },
        ),
        migrations.AddIndex(
            model_name='source',
            index=models.Index(fields=['ra', 'dec'], name='sources_sou_ra_dec_idx'),
        ),
        migrations.AddIndex(
            model_name='source',
            index=models.Index(fields=['primary_catalog'], name='sources_sou_primary_catalog_idx'),
        ),
        migrations.AddIndex(
            model_name='catalogentry',
            index=models.Index(fields=['catalog_name'], name='sources_cat_catalog_name_idx'),
        ),
        migrations.AddIndex(
            model_name='catalogentry',
            index=models.Index(fields=['source'], name='sources_cat_source_id_idx'),
        ),
    ]
