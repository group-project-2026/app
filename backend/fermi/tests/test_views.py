"""API endpoint tests."""

import pytest
from rest_framework.test import APIClient

from fermi.data_catalogues.utils import compute_healpix
from fermi.models import CatalogSource, CrossMatch


@pytest.fixture
def client():
    return APIClient()


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
def test_cone_search_returns_nearby_sources(client):
    _make_source("fermi_4fgl", "Crab", 83.63, 22.01)
    _make_source("tevcat", "FarSrc", 180.0, 0.0)  # far away

    resp = client.get("/api/sources/", {"ra": 83.63, "dec": 22.01, "radius": 1.0})
    assert resp.status_code == 200
    names = [s["source_name"] for s in resp.data["results"]]
    assert "Crab" in names
    assert "FarSrc" not in names


@pytest.mark.django_db
def test_cone_search_missing_params_returns_400(client):
    resp = client.get("/api/sources/", {"ra": 83.63})
    assert resp.status_code == 400


@pytest.mark.django_db
def test_cone_search_invalid_radius_returns_400(client):
    resp = client.get("/api/sources/", {"ra": 83.63, "dec": 22.01, "radius": 99})
    assert resp.status_code == 400


@pytest.mark.django_db
def test_list_without_cone_returns_all(client):
    _make_source("fermi_4fgl", "SrcA", 10.0, 20.0)
    _make_source("hawc", "SrcB", 50.0, 30.0)

    resp = client.get("/api/sources/")
    assert resp.status_code == 200
    assert resp.data["count"] == 2


@pytest.mark.django_db
def test_detail_returns_extra_field(client):
    src = CatalogSource.objects.create(
        catalog="fermi_4fgl",
        source_name="DetailSrc",
        ra=10.0,
        dec=20.0,
        healpix_id=compute_healpix(10.0, 20.0),
        extra={"spectrum_type": "PowerLaw"},
    )
    resp = client.get(f"/api/sources/{src.id}/")
    assert resp.status_code == 200
    assert resp.data["extra"]["spectrum_type"] == "PowerLaw"


@pytest.mark.django_db
def test_crossmatches_endpoint_returns_matches(client):
    src_a = _make_source("fermi_4fgl", "MatchSrcA", 10.0, 20.0)
    src_b = _make_source("tevcat", "MatchSrcB", 10.0, 20.0)
    CrossMatch.objects.create(
        source_a=src_a,
        source_b=src_b,
        separation_deg=0.0,
        method="name",
        confidence=1.0,
    )

    resp = client.get(f"/api/sources/{src_a.id}/crossmatches/")
    assert resp.status_code == 200
    assert len(resp.data) == 1
    match = resp.data[0]
    assert match["method"] == "name"
    assert match["source_a"]["id"] == src_a.id
    assert match["source_b"]["id"] == src_b.id


@pytest.mark.django_db
def test_crossmatches_endpoint_visible_from_either_source(client):
    src_a = _make_source("fermi_4fgl", "PairA", 10.0, 20.0)
    src_b = _make_source("hawc", "PairB", 10.0, 20.0)
    CrossMatch.objects.create(
        source_a=src_a,
        source_b=src_b,
        separation_deg=0.0,
        method="name",
        confidence=1.0,
    )

    resp_b = client.get(f"/api/sources/{src_b.id}/crossmatches/")
    assert resp_b.status_code == 200
    assert len(resp_b.data) == 1


@pytest.mark.django_db
def test_catalog_filter(client):
    _make_source("fermi_4fgl", "FermiSrc", 10.0, 20.0)
    _make_source("hawc", "HawcSrc", 11.0, 21.0)

    resp = client.get("/api/sources/", {"catalog": "fermi_4fgl"})
    assert resp.status_code == 200
    assert resp.data["count"] == 1
    assert resp.data["results"][0]["catalog"] == "fermi_4fgl"
