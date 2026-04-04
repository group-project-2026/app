"""Fermi 4FGL catalog loader.

Expects the 4FGL FITS file (e.g. gll_psc_v32.fit from
https://fermi.gsfc.nasa.gov/ssc/data/access/lat/12yr_catalog/).
"""

from astropy.io import fits

CATALOG = "fermi_4fgl"


def load(fits_path: str) -> list[dict]:
    """Return normalized records from the Fermi 4FGL FITS file."""
    with fits.open(fits_path) as hdul:
        data = hdul[1].data

    records = []
    for row in data:
        source_name = str(row["Source_Name"]).strip()
        ra = float(row["RAJ2000"])
        dec = float(row["DEJ2000"])

        # Conf_95_SemiMajor is the 95% confidence semi-major axis in degrees.
        # Convert to 1-sigma by dividing by 1.96 (Gaussian approximation).
        try:
            pos_err_deg = float(row["Conf_95_SemiMajor"]) / 1.96
        except (TypeError, ValueError):
            pos_err_deg = None

        try:
            flux = float(row["Flux1000"])
        except (TypeError, ValueError):
            flux = None

        try:
            flux_err = float(row["Unc_Flux1000"])
        except (TypeError, ValueError):
            flux_err = None

        spectrum_type = str(row["SpectrumType"]).strip()
        try:
            spectral_index = float(row["PL_Index"]) if spectrum_type == "PowerLaw" else None
        except (TypeError, ValueError):
            spectral_index = None

        records.append({
            "catalog": CATALOG,
            "source_name": source_name,
            "ra": ra,
            "dec": dec,
            "pos_err_deg": pos_err_deg,
            "flux": flux,
            "flux_err": flux_err,
            "flux_unit": "ph cm-2 s-1",
            "energy_min_gev": 1.0,
            "energy_max_gev": 100.0,
            "spectral_index": spectral_index,
            "source_class": str(row["CLASS1"]).strip(),
            "extra": {
                "glon": float(row["GLON"]),
                "glat": float(row["GLAT"]),
                "spectrum_type": spectrum_type,
            },
        })

    return records
