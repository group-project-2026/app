"""HAWC catalog loader.

Expects the HAWC 2HWC or 3HWC FITS catalog file.
Column names are inspected at load time to handle different catalog versions.

Typical columns in 2HWC: Name, RAJ2000, DEJ2000, r39 (39% containment radius)
Typical columns in 3HWC: Source_Name, RA, Dec, r39
"""

from astropy.io import fits

CATALOG = "hawc"


def load(fits_path: str) -> list[dict]:
    """Return normalized records from a HAWC catalog FITS file."""
    with fits.open(fits_path) as hdul:
        data = hdul[1].data
        col_names = [c.name.upper() for c in hdul[1].columns]

    # Resolve column names flexibly across catalog versions
    name_col = _find_col(col_names, ["SOURCE_NAME", "NAME"])
    ra_col   = _find_col(col_names, ["RAJ2000", "RA"])
    dec_col  = _find_col(col_names, ["DEJ2000", "DEC"])
    err_col  = _find_col(col_names, ["R39", "SIGMA_POS", "ERR_RA"], required=False)

    records = []
    for row in data:
        try:
            pos_err = float(row[err_col]) if err_col else None
        except (TypeError, ValueError):
            pos_err = None

        records.append({
            "catalog": CATALOG,
            "source_name": str(row[name_col]).strip(),
            "ra": float(row[ra_col]),
            "dec": float(row[dec_col]),
            "pos_err_deg": pos_err,
            "flux": None,
            "flux_err": None,
            "flux_unit": "",
            "energy_min_gev": None,
            "energy_max_gev": None,
            "spectral_index": None,
            "source_class": "",
            "extra": {},
        })

    return records


def _find_col(col_names: list[str], candidates: list[str], required: bool = True) -> str | None:
    for name in candidates:
        if name in col_names:
            return name
    if required:
        raise ValueError(
            f"Could not find any of {candidates} in HAWC FITS columns: {col_names}"
        )
    return None
