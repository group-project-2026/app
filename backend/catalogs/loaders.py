from abc import ABC, abstractmethod
from typing import List, Dict, Any
import math
import os
import ssl
import yaml

import numpy as np
import requests
from astropy.table import Table
from django.db import transaction

from app.settings import FILES_DIR

# Handle SSL certificate verification issues
# Create a custom session that handles certificates properly
def _get_session_with_ssl():
    """Get requests session with SSL handling."""
    session = requests.Session()
    try:
        # Try with certificate verification first
        session.verify = True
    except Exception:
        # Fallback to no verification (less secure but necessary for some sources)
        session.verify = False
    return session


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

        session = _get_session_with_ssl()
        try:
            response = session.get(self.fits_url, stream=True, timeout=120, verify=True)
            response.raise_for_status()
        except (requests.exceptions.SSLError, requests.exceptions.ConnectionError):
            # Retry without SSL verification as fallback
            response = session.get(self.fits_url, stream=True, timeout=120, verify=False)
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
    Uses the 3HWC catalog (Third HAWC Catalog) from YAML file.

    YAML source: https://data.hawc-observatory.org/datasets/3hwc-survey/3HWC.yaml
    """

    catalog_name = "HAWC"
    # YAML catalog file (contains actual source coordinates)
    YAML_URL = "https://data.hawc-observatory.org/datasets/3hwc-survey/3HWC.yaml"
    YAML_LOCAL = FILES_DIR / "3HWC.yaml"

    def __init__(self, yaml_path: str = None, yaml_url: str = None):
        self.yaml_path = yaml_path or self.YAML_LOCAL
        self.yaml_url = yaml_url or self.YAML_URL

    def load(self) -> List[Dict[str, Any]]:
        """Load HAWC 3HWC catalog from YAML and return normalized sources."""
        try:
            self._download()
            data = self._parse_yaml()
            return self._normalize(data)
        except FileNotFoundError:
            print(f"⚠️  HAWC YAML file not found at {self.yaml_path}")
            print("To load HAWC catalog, manually download from:")
            print(f"  {self.YAML_URL}")
            print(f"And place at: {self.YAML_LOCAL}")
            return []
        except Exception as e:
            print(f"⚠️  Error loading HAWC catalog: {type(e).__name__}: {e}")
            return []

    def _download(self) -> None:
        """Download YAML file if not already present."""
        if os.path.exists(self.yaml_path):
            return

        session = _get_session_with_ssl()
        try:
            # Try with SSL verification first
            response = session.get(self.yaml_url, stream=True, timeout=120, verify=True)
            response.raise_for_status()
        except (requests.exceptions.SSLError, requests.exceptions.ConnectionError) as e:
            # Retry without SSL verification as fallback
            print(f"SSL verification failed, retrying without verification: {e}")
            response = session.get(self.yaml_url, stream=True, timeout=120, verify=False)
            response.raise_for_status()

        with open(self.yaml_path, "wb") as f:
            f.write(response.content)

    def _parse_yaml(self) -> dict:
        """Parse YAML file."""
        with open(self.yaml_path, "r") as f:
            data = yaml.safe_load(f)
        return data

    def _normalize(self, data: dict) -> List[Dict[str, Any]]:
        """Convert YAML data to normalized source format."""
        sources = []

        # YAML structure - get sources list/dict
        if not data:
            return sources

        # Handle both list and dict formats
        items = data.values() if isinstance(data, dict) else data
        if isinstance(items, dict):
            items = items.values()

        items_list = list(items) if not isinstance(items, list) else items
        print(f"  Found {len(items_list)} potential sources in YAML")

        # Debug: print first item structure
        if items_list:
            print(f"  First source keys: {list(items_list[0].keys())}")

        # Iterate through sources
        for item in items_list:
            if not isinstance(item, dict):
                continue

            try:
                # Extract coordinates - try ALL possible variations
                ra = None
                dec = None

                # Try RA column - try all case variations
                for ra_key in ["RA", "ra", "Ra", "RA_J2000", "RAJ2000", "ra_j2000", "RA_DEG"]:
                    if ra_key in item:
                        ra = float(item[ra_key])
                        break

                # Try DEC column - try ALL case variations (Dec, DEC, dec, etc.)
                for dec_key in ["Dec", "DEC", "dec", "Dec_J2000", "DEC_J2000", "DEJ2000", "dec_j2000", "DEC_DEG", "Declination"]:
                    if dec_key in item:
                        dec = float(item[dec_key])
                        break

                if ra is None or dec is None:
                    # Debug message
                    if ra is None:
                        print(f"  ⚠️  Could not find RA in source: {item.get('name', 'unknown')}")
                    if dec is None:
                        print(f"  ⚠️  Could not find Dec in source: {item.get('name', 'unknown')}")
                    continue  # Skip if no coordinates

                # Extract source name
                source_name = None
                for name_key in ["name", "source_name", "Name", "Source_Name", "NAME", "designation", "source"]:
                    if name_key in item:
                        source_name = self._s(item[name_key])
                        break

                if not source_name:
                    source_name = f"HAWC J{ra:07.2f}{dec:+07.2f}"

                # Build metadata from available fields
                metadata = {
                    "catalog_version": "3HWC",
                    "detection_method": "gamma-ray (HAWC)",
                }

                # Extract common fields with all case variations
                common_fields = [
                    (["flux", "Flux", "FLUX"], "flux_tev"),
                    (["flux_upper_bound", "Flux_Upper_Bound"], "flux_tev_upper"),
                    (["flux_lower_bound", "Flux_Lower_Bound"], "flux_tev_lower"),
                    (["significance", "Significance"], "significance"),
                    (["spectral_index", "Spectral_Index", "index"], "spectral_index"),
                    (["spectral_index_error", "Spectral_Index_Error"], "spectral_index_err"),
                    (["TS", "ts", "Test_Statistic"], "ts"),
                    (["variability", "Variability"], "variability"),
                    (["extension", "Extension"], "extension"),
                ]

                for yaml_keys, meta_key in common_fields:
                    for yaml_key in yaml_keys:
                        if yaml_key in item:
                            metadata[meta_key] = self._f(item[yaml_key])
                            break

                source = {
                    "name": source_name,
                    "ra": ra,
                    "dec": dec,
                    "discovery_method": "gamma-ray (HAWC)",
                    "metadata": metadata,
                }
                sources.append(source)

            except (KeyError, ValueError, TypeError) as e:
                # Skip problematic rows silently
                continue

        print(f"  Successfully parsed {len(sources)} sources with coordinates")
        return sources

    @staticmethod
    def _f(val) -> float | None:
        """Value → Python float, NaN/Inf → None."""
        try:
            v = float(val)
            return None if (math.isnan(v) or math.isinf(v)) else v
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _s(val) -> str:
        return str(val).strip() if val is not None else ""


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
