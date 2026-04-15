from abc import ABC, abstractmethod
from typing import List, Dict, Any
import math
import os

import numpy as np
import requests
from astropy.table import Table
from django.db import transaction

from app.settings import FILES_DIR


class CatalogLoader(ABC):
    """
    Abstract base class for all catalog loaders.
    Each subclass implements load() to return normalized source data.
    """

    catalog_name: str  # FERMI, LHAASO, HAWC, TEVCAT, NED
    batch_size: int = 500

    @abstractmethod
    def load(self) -> List[Dict[str, Any]]:
        """
        Load raw data and return normalized list of sources.
        Each source dict must contain:
        {
            'name': str,              # Original catalog name
            'ra': float,              # Right Ascension [degrees]
            'dec': float,             # Declination [degrees]
            'metadata': dict,         # Catalog-specific data
            'discovery_method': str,  # Optional
        }
        """
        pass


class FermiLoader(CatalogLoader):
    """
    Load Fermi-LAT 4FGL catalog from FITS file.
    Reuses existing FermiDataImporter logic.
    """

    catalog_name = "FERMI"
    FITS_URL = "https://fermi.gsfc.nasa.gov/ssc/data/access/lat/10yr_catalog/gll_psc_v27.fit"
    FITS_LOCAL = FILES_DIR / "gll_psc_v27.fit"

    def __init__(self, fits_path: str = None, fits_url: str = None):
        self.fits_path = fits_path or self.FITS_LOCAL
        self.fits_url = fits_url or self.FITS_URL

    def load(self) -> List[Dict[str, Any]]:
        """Load Fermi-LAT catalog and return normalized sources."""
        self._download()
        table = self._parse()
        return self._normalize(table)

    def _download(self) -> None:
        if os.path.exists(self.fits_path):
            return

        response = requests.get(self.fits_url, stream=True, timeout=120)
        response.raise_for_status()

        with open(self.fits_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=1 << 20):
                f.write(chunk)

    def _parse(self) -> Table:
        return Table.read(self.fits_path, hdu=1)

    def _normalize(self, table: Table) -> List[Dict[str, Any]]:
        """Convert FITS table to normalized source format."""
        cols = set(table.colnames)
        sources = []

        for row in table:
            ra = float(row["RAJ2000"])
            dec = float(row["DEJ2000"])

            source = {
                "name": self._s(row["Source_Name"]),
                "ra": ra,
                "dec": dec,
                "discovery_method": "gamma-ray",
                "metadata": {
                    "source_class": self._s(row.get("CLASS1", "")),
                    "associated_name": self._s(row.get("ASSOC1", "")),
                    "glon": float(row.get("GLON", 0)),
                    "glat": float(row.get("GLAT", 0)),
                    "flux1000": self._f(row.get("Flux1000")),
                    "flux1000_err": self._f(row.get("Unc_Flux1000")),
                    "significance": self._f(row.get("Signif_Avg")),
                    "ts": self._f(row.get("Test_Statistic")),
                    "spectral_type": self._s(row.get("SpectrumType", "")),
                    "pivot_energy": self._f(row.get("Pivot_Energy")),
                    "spectral_index": self._f(row.get("PL_Index")),
                    "spectral_index_err": self._f(row.get("Unc_PL_Index")),
                    "redshift": self._f(row.get("Redshift")),
                    "variability_index": self._f(row.get("Variability_Index")),
                    "is_variable": bool(int(row.get("Flags", 0)) & (1 << 2)),
                    "flags": int(row.get("Flags", 0)),
                    "data_release": int(row.get("DataRelease", 2)),
                    "pos_err_semi_major": self._f(row.get("Conf_95_SemiMajor")),
                    "pos_err_semi_minor": self._f(row.get("Conf_95_SemiMinor")),
                    "pos_err_angle": self._f(row.get("Conf_95_PosAng")),
                },
            }
            sources.append(source)

        return sources

    @staticmethod
    def _f(val) -> float | None:
        """FITS value → Python float, NaN/Inf → None."""
        try:
            v = float(val)
            return None if (math.isnan(v) or math.isinf(v)) else v
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _s(val) -> str:
        return str(val).strip() if val is not None else ""


class LHASOLoader(CatalogLoader):
    """
    Load LHAASO catalog (Large High Altitude Air Shower Observatory).
    LHAASO is a gamma-ray observatory for TeV energy range.
    """

    catalog_name = "LHAASO"

    def load(self) -> List[Dict[str, Any]]:
        """
        Load LHAASO sources.
        TODO: Implement LHAASO FITS/ASCII loading from catalog file or API.
        """
        # Placeholder: return empty list until LHAASO data source is available
        return []


class HAWCLoader(CatalogLoader):
    """
    Load HAWC catalog (High Altitude Water Cherenkov detector).
    HAWC is a gamma-ray observatory for TeV-scale gamma rays.
    """

    catalog_name = "HAWC"

    def load(self) -> List[Dict[str, Any]]:
        """
        Load HAWC sources from 3HWC catalog.
        TODO: Implement HAWC FITS loading from catalog file or API.
        """
        # Placeholder: return empty list until HAWC data source is available
        return []


class TeVCatLoader(CatalogLoader):
    """
    Load TeVCat catalog (TeV source catalog).
    TeVCat is a comprehensive catalog of TeV gamma-ray sources.
    """

    catalog_name = "TEVCAT"

    def load(self) -> List[Dict[str, Any]]:
        """
        Load TeVCat sources from ASCII/CSV file or API.
        TODO: Implement TeVCat loading.
        """
        # Placeholder: return empty list until TeVCat data source is available
        return []


class NEDLoader(CatalogLoader):
    """
    Load NED (NASA Extragalactic Database) sources.
    NED is a comprehensive extragalactic database.
    """

    catalog_name = "NED"

    def load(self) -> List[Dict[str, Any]]:
        """
        Load NED sources via API or pre-cached data.
        TODO: Implement NED API querying or cached data loading.
        """
        # Placeholder: return empty list until NED data source is available
        return []


class LoaderFactory:
    """Factory for creating appropriate loader instance by catalog name."""

    _loaders = {
        "FERMI": FermiLoader,
        "LHAASO": LHASOLoader,
        "HAWC": HAWCLoader,
        "TEVCAT": TeVCatLoader,
        "NED": NEDLoader,
    }

    @classmethod
    def create(cls, catalog_name: str) -> CatalogLoader:
        """Create and return loader for given catalog."""
        loader_class = cls._loaders.get(catalog_name)
        if not loader_class:
            raise ValueError(f"Unknown catalog: {catalog_name}")
        return loader_class()

    @classmethod
    def get_available_catalogs(cls) -> List[str]:
        """Return list of available catalog names."""
        return list(cls._loaders.keys())
