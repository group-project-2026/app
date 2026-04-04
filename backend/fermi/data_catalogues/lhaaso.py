"""LHAASO catalog loader.

Expects the 1LHAASO FITS catalog file.
Column names are inspected at load time to handle future catalog versions.

Typical columns in 1LHAASO: Source_Name, R.A., Dec., r95 (95% error radius in deg),
  Flux_1_25 (differential flux), Index
"""

from astropy.io import fits

CATALOG = "lhaaso"


def load(fits_path: str) -> list[dict]:
    """Return normalized records from a LHAASO catalog FITS file."""
    with fits.open(fits_path) as hdul:
        data = hdul[1].data
        col_names = [c.name.upper() for c in hdul[1].columns]

    name_col  = _find_col(col_names, ["SOURCE_NAME", "NAME", "1LHAASO"])
    ra_col    = _find_col(col_names, ["R.A.", "RA", "RAJ2000"])
    dec_col   = _find_col(col_names, ["DEC.", "DEC", "DEJ2000"])
    err_col   = _find_col(col_names, ["R95", "SIGMA_POS", "ERR"], required=False)
    flux_col  = _find_col(col_names, ["FLUX_1_25", "FLUX"], required=False)
    index_col = _find_col(col_names, ["INDEX", "SPECTRAL_INDEX"], required=False)
    class_col = _find_col(col_names, ["TYPE", "CLASS", "ASSOC"], required=False)

    records = []
    for row in data:
        pos_err = _safe_float(row, err_col)
        if pos_err is not None:
            # If stored as 95% radius, convert to 1-sigma (Gaussian approximation)
            pos_err = pos_err / 1.96

        records.append({
            "catalog": CATALOG,
            "source_name": str(row[name_col]).strip(),
            "ra": float(row[ra_col]),
            "dec": float(row[dec_col]),
            "pos_err_deg": pos_err,
            "flux": _safe_float(row, flux_col),
            "flux_err": None,
            "flux_unit": "TeV-1 cm-2 s-1" if flux_col else "",
            "energy_min_gev": 1000.0,   # LHAASO sensitivity starts at ~1 TeV
            "energy_max_gev": None,
            "spectral_index": _safe_float(row, index_col),
            "source_class": str(row[class_col]).strip() if class_col else "",
            "extra": {},
        })

    return records


def _find_col(col_names: list[str], candidates: list[str], required: bool = True) -> str | None:
    for name in candidates:
        if name in col_names:
            return name
    if required:
        raise ValueError(
            f"Could not find any of {candidates} in LHAASO FITS columns: {col_names}"
        )
    return None


def _safe_float(row, col: str | None):
    if col is None:
        return None
    try:
        return float(row[col])
    except (TypeError, ValueError):
        return None
