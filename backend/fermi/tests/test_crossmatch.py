"""Integration tests for crossmatch logic."""

import pytest

from fermi.crossmatch import _normalize_name, run_crossmatch
from fermi.data_catalogues.utils import compute_healpix
from fermi.models import CatalogSource, CrossMatch


def _make_source(catalog, name, ra, dec, pos_err=None):
    return CatalogSource.objects.create(
        catalog=catalog,
        source_name=name,
        ra=ra,
        dec=dec,
        pos_err_deg=pos_err,
        healpix_id=compute_healpix(ra, dec),
    )


@pytest.mark.django_db
def test_name_match_creates_crossmatch():
    _make_source("fermi_4fgl", "4FGL J0534+2200", 83.63, 22.01)
    _make_source("tevcat", "J0534+2200", 83.63, 22.01)

    name_count, _ = run_crossmatch()
    assert name_count >= 1
    assert CrossMatch.objects.filter(method="name").count() >= 1


@pytest.mark.django_db
def test_position_match_within_threshold():
    # Two sources 0.01 degrees apart with 0.05 deg pos_err — should match
    _make_source("fermi_4fgl", "TestSrcA", 10.0, 20.0, pos_err=0.05)
    _make_source("hawc", "TestSrcB", 10.01, 20.0, pos_err=0.05)

    _, pos_count = run_crossmatch()
    assert pos_count >= 1
    assert CrossMatch.objects.filter(method="position").count() >= 1


@pytest.mark.django_db
def test_position_no_match_beyond_threshold():
    # Two sources 2.0 degrees apart with 0.05 deg pos_err — should NOT match
    _make_source("fermi_4fgl", "FarSrcA", 0.0, 0.0, pos_err=0.05)
    _make_source("hawc", "FarSrcB", 2.0, 0.0, pos_err=0.05)

    _, pos_count = run_crossmatch()
    assert pos_count == 0


@pytest.mark.django_db
def test_crossmatch_same_catalog_not_matched():
    # Sources from the same catalog should never be crossmatched by position
    _make_source("fermi_4fgl", "SameCatA", 10.0, 20.0, pos_err=0.5)
    _make_source("fermi_4fgl", "SameCatB", 10.001, 20.0, pos_err=0.5)

    _, pos_count = run_crossmatch()
    assert pos_count == 0


def test_normalize_name_strips_catalog_prefix():
    assert _normalize_name("4FGL J0534+2200") == "0534+2200"
    assert _normalize_name("LHAASO J1825-1326") == "1825-1326"
    assert _normalize_name("2HWC J0534+220") == "0534+220"


def test_normalize_name_case_insensitive():
    assert _normalize_name("4FGL J0001+0001") == _normalize_name("4fgl j0001+0001")
