"""Tests for catalog loader modules."""

import io
from unittest.mock import patch

import numpy as np
import pytest
from astropy.io import fits

from fermi.data_catalogues import tevcat
from fermi.data_catalogues.fermi import load as fermi_load
from fermi.data_catalogues.hawc import load as hawc_load


def _make_fermi_fits(tmpdir) -> str:
    """Create a minimal Fermi 4FGL-like FITS file for testing."""
    col_names = [
        "Source_Name", "RAJ2000", "DEJ2000",
        "Conf_95_SemiMajor", "Flux1000", "Unc_Flux1000",
        "SpectrumType", "PL_Index", "CLASS1", "GLON", "GLAT",
    ]
    data = {
        "Source_Name": np.array(["4FGL J0001.2+4741"]),
        "RAJ2000": np.array([0.316], dtype=np.float64),
        "DEJ2000": np.array([47.69], dtype=np.float64),
        "Conf_95_SemiMajor": np.array([0.05], dtype=np.float64),
        "Flux1000": np.array([1.2e-9], dtype=np.float64),
        "Unc_Flux1000": np.array([1.0e-10], dtype=np.float64),
        "SpectrumType": np.array(["PowerLaw"]),
        "PL_Index": np.array([2.1], dtype=np.float64),
        "CLASS1": np.array(["BLL"]),
        "GLON": np.array([113.6], dtype=np.float64),
        "GLAT": np.array([-14.9], dtype=np.float64),
    }

    cols = [
        fits.Column(name=k, format="20A" if v.dtype.kind in ("U", "S", "O") else "D", array=v)
        for k, v in data.items()
    ]
    hdu = fits.BinTableHDU.from_columns(cols)
    path = str(tmpdir / "fermi_4fgl.fits")
    hdu.writeto(path, overwrite=True)
    return path


def _make_hawc_fits(tmpdir) -> str:
    """Create a minimal HAWC-like FITS file for testing."""
    data = {
        "Source_Name": np.array(["2HWC J0534+220"]),
        "RAJ2000": np.array([83.63], dtype=np.float64),
        "DEJ2000": np.array([22.01], dtype=np.float64),
        "r39": np.array([0.1], dtype=np.float64),
    }
    cols = [
        fits.Column(name=k, format="20A" if v.dtype.kind in ("U", "S", "O") else "D", array=v)
        for k, v in data.items()
    ]
    hdu = fits.BinTableHDU.from_columns(cols)
    path = str(tmpdir / "hawc.fits")
    hdu.writeto(path, overwrite=True)
    return path


def test_fermi_loader_required_keys(tmp_path):
    path = _make_fermi_fits(tmp_path)
    records = fermi_load(path)

    assert len(records) == 1
    r = records[0]
    required = ["catalog", "source_name", "ra", "dec", "pos_err_deg",
                "flux", "flux_unit", "energy_min_gev", "energy_max_gev",
                "source_class", "extra"]
    for key in required:
        assert key in r, f"Missing key: {key}"


def test_fermi_loader_values(tmp_path):
    path = _make_fermi_fits(tmp_path)
    r = fermi_load(path)[0]

    assert r["catalog"] == "fermi_4fgl"
    assert r["source_name"] == "4FGL J0001.2+4741"
    assert r["ra"] == pytest.approx(0.316)
    assert r["dec"] == pytest.approx(47.69)
    assert r["pos_err_deg"] == pytest.approx(0.05 / 1.96, rel=1e-3)
    assert r["flux"] == pytest.approx(1.2e-9, rel=1e-3)
    assert r["source_class"] == "BLL"
    assert r["extra"]["spectrum_type"] == "PowerLaw"


def test_hawc_loader_required_keys(tmp_path):
    path = _make_hawc_fits(tmp_path)
    records = hawc_load(path)

    assert len(records) == 1
    r = records[0]
    assert r["catalog"] == "hawc"
    assert r["source_name"] == "2HWC J0534+220"
    assert r["ra"] == pytest.approx(83.63)
    assert r["dec"] == pytest.approx(22.01)
    assert r["pos_err_deg"] == pytest.approx(0.1)


TEVCAT_CSV = """ID,Source Name,RA,Dec,Type
1,Crab,83.63,22.01,PWN
2,Mrk 421,166.11,38.21,HBL
"""


def test_tevcat_loader_mocked():
    with patch("fermi.data_catalogues.tevcat.requests.get") as mock_get:
        mock_get.return_value.text = TEVCAT_CSV
        mock_get.return_value.raise_for_status = lambda: None

        records = tevcat.load()

    assert len(records) == 2
    assert records[0]["source_name"] == "Crab"
    assert records[0]["catalog"] == "tevcat"
    assert records[0]["ra"] == pytest.approx(83.63)
    assert records[1]["source_class"] == "HBL"
