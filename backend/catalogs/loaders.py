from abc import ABC, abstractmethod
from typing import List, Dict, Any
import math
import os
import yaml

import requests
from astropy.table import Table

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

        os.makedirs(os.path.dirname(self.fits_path), exist_ok=True)

        session = _get_session_with_ssl()
        try:
            response = session.get(
                self.fits_url, stream=True, timeout=120, verify=True)
            response.raise_for_status()
        except (requests.exceptions.SSLError, requests.exceptions.ConnectionError):
            # Retry without SSL verification as fallback
            response = session.get(
                self.fits_url, stream=True, timeout=120, verify=False)
            response.raise_for_status()

        with open(self.fits_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=1 << 20):
                f.write(chunk)

    def _parse(self) -> Table:
        return Table.read(self.fits_path, hdu=1)

    def _normalize(self, table: Table) -> List[Dict[str, Any]]:
        """Convert FITS table to normalized source format."""
        sources = []

        for row in table:
            ra = float(row["RAJ2000"])
            dec = float(row["DEJ2000"])

            # Standardize position error units: arcmin → degrees
            pos_err_semi_major = self._f(row.get("Conf_95_SemiMajor"))
            pos_err_semi_minor = self._f(row.get("Conf_95_SemiMinor"))

            # Convert from arcmin to degrees (Fermi FITS typically uses arcmin)
            if pos_err_semi_major and pos_err_semi_major > 1:
                pos_err_semi_major /= 60.0
            if pos_err_semi_minor and pos_err_semi_minor > 1:
                pos_err_semi_minor /= 60.0

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
                    "spectral_type": self._s(row.get("SpectrumType", "")),
                    "pivot_energy": self._f(row.get("Pivot_Energy")),
                    "spectral_index": self._f(row.get("PL_Index")),
                    "spectral_index_err": self._f(row.get("Unc_PL_Index")),
                    "variability_index": self._f(row.get("Variability_Index")),
                    "is_variable": bool(int(row.get("Flags", 0)) & (1 << 2)),
                    "flags": int(row.get("Flags", 0)),
                    "data_release": int(row.get("DataRelease", 2)),
                    "pos_err_semi_major": pos_err_semi_major,
                    "pos_err_semi_minor": pos_err_semi_minor,
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

    Loads from gammapy-data repository: 1LHAASO_catalog.fits
    Catalog reference: https://arxiv.org/abs/2305.17030 (LHAASO DR1)
    """

    catalog_name = "LHAASO"
    FITS_URL = "https://raw.githubusercontent.com/gammapy/gammapy-data/main/catalogs/1LHAASO_catalog.fits"
    FITS_LOCAL = FILES_DIR / "1LHAASO_catalog.fits"

    def __init__(self, fits_path: str = None, fits_url: str = None):
        self.fits_path = fits_path or self.FITS_LOCAL
        self.fits_url = fits_url or self.FITS_URL

    def load(self) -> List[Dict[str, Any]]:
        """Load LHAASO catalog from FITS file."""
        try:
            self._download()
            table = self._parse()
            return self._normalize(table)
        except FileNotFoundError:
            print(f"⚠️  LHAASO FITS file not found at {self.fits_path}")
            print("To load LHAASO catalog, manually download from:")
            print(f"  {self.FITS_URL}")
            print(f"And place at: {self.FITS_LOCAL}")
            return []
        except Exception as e:
            print(f"⚠️  Error loading LHAASO catalog: {type(e).__name__}: {e}")
            return []

    def _download(self) -> None:
        """Download FITS file if not already present."""
        if os.path.exists(self.fits_path):
            return

        os.makedirs(os.path.dirname(self.fits_path), exist_ok=True)

        session = _get_session_with_ssl()
        try:
            # Try with SSL verification first
            response = session.get(
                self.fits_url, stream=True, timeout=120, verify=True)
            response.raise_for_status()
        except (requests.exceptions.SSLError, requests.exceptions.ConnectionError) as e:
            # Retry without SSL verification as fallback
            print(
                f"SSL verification failed, retrying without verification: {e}")
            response = session.get(
                self.fits_url, stream=True, timeout=120, verify=False)
            response.raise_for_status()

        with open(self.fits_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=1 << 20):
                f.write(chunk)

    def _parse(self) -> Table:
        """Parse FITS file."""
        return Table.read(self.fits_path, hdu=1)

    def _normalize(self, table: Table) -> List[Dict[str, Any]]:
        """Convert FITS table to normalized source format."""
        sources = []

        print(f"  Found {len(table)} sources in LHAASO FITS catalog")

        for i, row in enumerate(table):
            try:
                # Extract coordinates - FITS typically uses RA/DEC or RAJ2000/DEJ2000
                ra = None
                dec = None

                # Try different column name variations
                for ra_col in ["RA", "ra", "RAJ2000", "RA_J2000"]:
                    if ra_col in table.colnames:
                        ra = float(row[ra_col])
                        break

                for dec_col in ["DEC", "dec", "DEJ2000", "DE_J2000", "DECJ2000", "DEC_J2000"]:
                    if dec_col in table.colnames:
                        dec = float(row[dec_col])
                        break

                if ra is None or dec is None:
                    continue

                # Extract source name
                source_name = None
                for name_col in ["Source_Name", "source_name", "NAME", "name"]:
                    if name_col in table.colnames:
                        source_name = str(row[name_col]).strip()
                        break

                if not source_name:
                    source_name = f"LHAASO J{ra:07.2f}{dec:+07.2f}"

                # Extract metadata from available columns
                metadata = {
                    "catalog_version": "LHAASO DR1",
                    "detection_method": "gamma-ray (LHAASO)",
                }

                # Try to extract flux information
                for flux_col in ["Flux_1TeV", "flux", "Flux", "integral_flux", "N0"]:
                    if flux_col in table.colnames:
                        try:
                            metadata["flux_tev"] = self._f(row[flux_col])
                        except Exception:
                            pass

                # Extract spectral index
                for spec_col in ["Spectral_Index", "spectral_index", "Index", "gamma"]:
                    if spec_col in table.colnames:
                        try:
                            metadata["spectral_index"] = self._f(row[spec_col])
                        except Exception:
                            pass

                # Extract significance
                for sig_col in ["Significance", "significance", "TS", "ts"]:
                    if sig_col in table.colnames:
                        try:
                            metadata["significance"] = self._f(row[sig_col])
                        except Exception:
                            pass

                # Extract extension/size
                for ext_col in ["Extension", "extension", "Size", "size", "Radius", "r39"]:
                    if ext_col in table.colnames:
                        try:
                            metadata["extension_deg"] = self._f(row[ext_col])
                        except Exception:
                            pass

                # Extract position error
                pos_err_found = False
                for pos_err_col in ["POS_ERR", "pos_err", "POSITIONAL_ERROR", "position_error", "pos_err_deg", "sigma_p95"]:
                    if pos_err_col in table.colnames:
                        try:
                            err_val = self._f(row[pos_err_col])
                            if err_val:
                                metadata["pos_err_circular_deg"] = err_val
                                pos_err_found = True
                                break
                        except Exception:
                            pass

                # Use catalog default if not found
                if not pos_err_found:
                    # LHAASO DR1 typical
                    metadata["pos_err_circular_deg"] = 0.02

                sources.append({
                    "name": source_name,
                    "ra": ra,
                    "dec": dec,
                    "discovery_method": "gamma-ray (LHAASO)",
                    "metadata": metadata,
                })

            except (KeyError, ValueError, TypeError) as e:
                # Skip problematic rows
                print(f"  Skipping row with error: {type(e).__name__}: {e}")
                continue

        print(f"  Successfully parsed {len(sources)} LHAASO sources")
        return sources

    @staticmethod
    def _f(val) -> float | None:
        """Value → Python float, NaN/Inf → None."""
        try:
            v = float(val)
            return None if (math.isnan(v) or math.isinf(v)) else v
        except (TypeError, ValueError, AttributeError):
            return None


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

        os.makedirs(os.path.dirname(self.yaml_path), exist_ok=True)

        session = _get_session_with_ssl()
        try:
            # Try with SSL verification first
            response = session.get(
                self.yaml_url, stream=True, timeout=120, verify=True)
            response.raise_for_status()
        except (requests.exceptions.SSLError, requests.exceptions.ConnectionError) as e:
            # Retry without SSL verification as fallback
            print(
                f"SSL verification failed, retrying without verification: {e}")
            response = session.get(
                self.yaml_url, stream=True, timeout=120, verify=False)
            response.raise_for_status()

        with open(self.yaml_path, "wb") as f:
            f.write(response.content)

    def _parse_yaml(self) -> dict:
        """Parse YAML file."""
        with open(self.yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data

    def _normalize(self, data: dict) -> List[Dict[str, Any]]:
        """Convert HAWC 3HWC YAML to normalized source format.

        Expected item shape (simplified):
        {
          "name": "3HWC J0534+220",
          "RA": 83.62,
          "Dec": 22.02,
          "l": 184.5,
          "b": -5.7,
          "position uncertainty": 0.05,
          "search radius": 0.0,
          "TS": 123.4,
          "flux measurements": [ {"assumed radius": 0.0, "flux": ..., "index": ...}, ... ]
        }
        """

        sources: List[Dict[str, Any]] = []

        if not data:
            return sources

        if isinstance(data, dict):
            items = list(data.values())
        elif isinstance(data, list):
            items = data
        else:
            return sources

        for item in items:
            if not isinstance(item, dict):
                continue

            ra = None
            dec = None
            for ra_key in ["RA", "ra", "Ra", "RA_J2000", "RAJ2000", "ra_j2000", "RA_DEG"]:
                if ra_key in item:
                    ra = self._f(item.get(ra_key))
                    break

            for dec_key in [
                "Dec",
                "DEC",
                "dec",
                "Dec_J2000",
                "DEC_J2000",
                "DEJ2000",
                "dec_j2000",
                "DEC_DEG",
                "Declination",
            ]:
                if dec_key in item:
                    dec = self._f(item.get(dec_key))
                    break

            if ra is None or dec is None:
                continue

            source_name = self._s(
                item.get("name")
                or item.get("Name")
                or item.get("source_name")
                or item.get("Source_Name")
                or item.get("designation")
            )
            if not source_name:
                source_name = f"3HWC J{ra:07.2f}{dec:+07.2f}"

            metadata: Dict[str, Any] = {
                "catalog_version": "3HWC",
                "detection_method": "gamma-ray (HAWC)",
            }

            glon = self._f(item.get("l"))
            glat = self._f(item.get("b"))
            if glon is not None:
                metadata["glon"] = glon
            if glat is not None:
                metadata["glat"] = glat

            pos_unc = self._f(
                item.get("position uncertainty")
                or item.get("position_uncertainty")
                or item.get("pos_uncertainty")
                or item.get("pos_err")
            )
            metadata["pos_err_circular_deg"] = pos_unc if pos_unc is not None else 0.08

            search_radius = self._f(item.get("search radius") or item.get("search_radius"))
            if search_radius is not None:
                metadata["search_radius_deg"] = search_radius

            ts = self._f(item.get("TS") or item.get("ts") or item.get("Test_Statistic"))
            if ts is not None:
                metadata["ts"] = ts
                if ts >= 0:
                    metadata["significance"] = math.sqrt(ts)

            flux_measurements_raw = (
                item.get("flux measurements")
                or item.get("flux_measurements")
                or item.get("fluxMeasurements")
            )
            preferred_measurement: Dict[str, float] | None = None
            zero_radius_measurement: Dict[str, float] | None = None
            first_measurement: Dict[str, float] | None = None

            if isinstance(flux_measurements_raw, list):
                for measurement in flux_measurements_raw:
                    if not isinstance(measurement, dict):
                        continue

                    assumed_radius = self._f(
                        measurement.get("assumed radius")
                        or measurement.get("assumed_radius")
                    )
                    flux = self._f(measurement.get("flux"))
                    flux_unc_up = self._f(
                        measurement.get("flux statistical uncertainty up")
                        or measurement.get("flux_statistical_uncertainty_up")
                    )
                    flux_unc_down = self._f(
                        measurement.get("flux statistical uncertainty down")
                        or measurement.get("flux_statistical_uncertainty_down")
                    )
                    spec_index = self._f(measurement.get("index"))
                    index_unc_up = self._f(
                        measurement.get("index statistical uncertainty up")
                        or measurement.get("index_statistical_uncertainty_up")
                    )
                    index_unc_down = self._f(
                        measurement.get("index statistical uncertainty down")
                        or measurement.get("index_statistical_uncertainty_down")
                    )

                    candidate: Dict[str, float] = {}
                    if assumed_radius is not None:
                        candidate["assumed_radius_deg"] = assumed_radius
                    if flux is not None:
                        candidate["flux"] = flux
                    if flux_unc_up is not None:
                        candidate["flux_unc_up"] = flux_unc_up
                    if flux_unc_down is not None:
                        candidate["flux_unc_down"] = flux_unc_down
                    if spec_index is not None:
                        candidate["spectral_index"] = spec_index
                    if index_unc_up is not None:
                        candidate["index_unc_up"] = index_unc_up
                    if index_unc_down is not None:
                        candidate["index_unc_down"] = index_unc_down

                    if not candidate:
                        continue

                    if first_measurement is None:
                        first_measurement = candidate

                    if assumed_radius is not None and abs(assumed_radius) < 1e-9:
                        zero_radius_measurement = candidate

                    if (
                        search_radius is not None
                        and assumed_radius is not None
                        and abs(assumed_radius - search_radius) < 1e-9
                    ):
                        preferred_measurement = candidate
                        break

            chosen = preferred_measurement or zero_radius_measurement or first_measurement
            if chosen:
                flux = chosen.get("flux")
                if flux is not None:
                    metadata["flux1000"] = flux
                    flux_errs = []
                    if chosen.get("flux_unc_up") is not None:
                        flux_errs.append(abs(chosen["flux_unc_up"]))
                    if chosen.get("flux_unc_down") is not None:
                        flux_errs.append(abs(chosen["flux_unc_down"]))
                    if flux_errs:
                        metadata["flux1000_err"] = max(flux_errs)

                spec_index = chosen.get("spectral_index")
                if spec_index is not None:
                    metadata["spectral_index"] = spec_index
                    index_errs = []
                    if chosen.get("index_unc_up") is not None:
                        index_errs.append(abs(chosen["index_unc_up"]))
                    if chosen.get("index_unc_down") is not None:
                        index_errs.append(abs(chosen["index_unc_down"]))
                    if index_errs:
                        metadata["spectral_index_err"] = max(index_errs)

            sources.append(
                {
                    "name": source_name,
                    "ra": ra,
                    "dec": dec,
                    "discovery_method": "gamma-ray (HAWC)",
                    "metadata": metadata,
                }
            )

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
    Load TeVCat catalog (TeV source catalog) via HEASARC TAP service.

    HEASARC mirrors TeVCat at https://heasarc.gsfc.nasa.gov/W3Browse/all/tevcat.html
    Queried through astroquery using the table name "tevcat".
    """

    catalog_name = "TEVCAT"
    HEASARC_TABLE = "tevcat"

    def load(self) -> List[Dict[str, Any]]:
        try:
            from astroquery.heasarc import Heasarc
        except ImportError:
            print("⚠️  astroquery not installed; cannot load TeVCat")
            return []

        try:
            heasarc = Heasarc()
            result = heasarc.query_tap(
                query=f"SELECT * FROM {self.HEASARC_TABLE}")
            table = result.to_table()
        except Exception as e:
            print(f"⚠️  Error querying HEASARC TeVCat: {
                  type(e).__name__}: {e}")
            return []

        return self._normalize(table)

    def _normalize(self, table: Table) -> List[Dict[str, Any]]:
        sources = []
        for row in table:
            ra = self._f(row.get("ra"))
            dec = self._f(row.get("dec"))
            if ra is None or dec is None:
                continue

            name = self._s(row.get("name")) or f"TeVCat J{
                ra:07.2f}{dec:+07.2f}"

            metadata = {
                "catalog_version": "TeVCat (HEASARC)",
                "source_type": self._s(row.get("source_type")),
                "alt_name": self._s(row.get("alt_name")),
                "flux_crab": self._f(row.get("flux")),
                "spectral_index": self._f(row.get("spectral_index")),
                "distance": self._f(row.get("distance")),
                "redshift": self._f(row.get("redshift")),
                "discovery_date": self._s(row.get("discovery_date")),
                "extended": bool(self._f(row.get("extended_flag")) or 0),
                "x_size": self._f(row.get("x_size")),
                "y_size": self._f(row.get("y_size")),
                "lii": self._f(row.get("lii")),
                "bii": self._f(row.get("bii")),
            }

            # Extract position error - try multiple column name variations
            pos_err_found = False
            for pos_err_col in ["ra_err", "dec_err", "pos_err", "position_error", "RA_ERR", "DEC_ERR"]:
                if pos_err_col in row.colnames:
                    try:
                        err_val = self._f(row[pos_err_col])
                        if err_val:
                            metadata["pos_err_circular_deg"] = err_val
                            pos_err_found = True
                            break
                    except Exception:
                        pass

            # If separate RA and DEC errors, combine them
            if not pos_err_found and ("ra_err" in row.colnames or "dec_err" in row.colnames):
                try:
                    ra_err = self._f(row.get("ra_err")
                                     ) if "ra_err" in row.colnames else None
                    dec_err = self._f(row.get("dec_err")
                                      ) if "dec_err" in row.colnames else None
                    if ra_err and dec_err:
                        combined_err = math.sqrt(ra_err**2 + dec_err**2)
                        metadata["pos_err_circular_deg"] = combined_err
                        pos_err_found = True
                except Exception:
                    pass

            # Use catalog default if not found (TeVCat typical ~0.02-0.1°)
            if not pos_err_found:
                # Conservative default for TeVCat
                metadata["pos_err_circular_deg"] = 0.05

            sources.append({
                "name": name,
                "ra": ra,
                "dec": dec,
                "discovery_method": "gamma-ray (TeV)",
                "metadata": metadata,
            })

        return sources

    @staticmethod
    def _f(val) -> float | None:
        try:
            if val is None:
                return None
            v = float(val)
            return None if (math.isnan(v) or math.isinf(v)) else v
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _s(val) -> str:
        if val is None:
            return ""
        try:
            s = str(val).strip()
        except Exception:
            return ""
        return "" if s in ("--", "nan", "None", "masked") else s


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
