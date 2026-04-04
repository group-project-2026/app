"""TeVCat catalog loader.

Fetches the TeVCat source list from the public web endpoint as CSV.
No local FITS file required.
"""

import csv
import io

import requests

CATALOG = "tevcat"
SOURCE_URL = "http://tevcat.uchicago.edu/?mode=1&action=dump"


def load(fits_path=None) -> list[dict]:
    """Fetch TeVCat CSV and return normalized records.

    fits_path is accepted for interface compatibility but ignored.
    """
    resp = requests.get(SOURCE_URL, timeout=30)
    resp.raise_for_status()

    reader = csv.DictReader(io.StringIO(resp.text))
    records = []
    for row in reader:
        try:
            ra = float(row.get("RA") or row.get("ra") or 0)
            dec = float(row.get("Dec") or row.get("dec") or 0)
        except (TypeError, ValueError):
            continue

        source_name = (
            row.get("Source Name") or row.get("source_name") or row.get("name") or ""
        ).strip()
        if not source_name:
            continue

        records.append({
            "catalog": CATALOG,
            "source_name": source_name,
            "ra": ra,
            "dec": dec,
            "pos_err_deg": None,
            "flux": None,
            "flux_err": None,
            "flux_unit": "",
            "energy_min_gev": None,
            "energy_max_gev": None,
            "spectral_index": None,
            "source_class": (row.get("Type") or row.get("type") or "").strip(),
            "extra": {
                "tevcat_id": row.get("ID") or row.get("id") or "",
            },
        })

    return records
