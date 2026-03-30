# catalog/management/commands/import_fermi.py
#
# Użycie:
#   python manage.py import_fermi
#   python manage.py import_fermi --fits path/to/gll_psc_v27.fit
#   python manage.py import_fermi --url https://fermi.gsfc.nasa.gov/.../gll_psc_v27.fit

import math
import os

import numpy as np
import requests
from astropy.table import Table
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from app.settings import FILES_DIR
from fermi.models.fermi import FermiSource, SedPoint

FITS_URL = (
    "https://fermi.gsfc.nasa.gov/ssc/data/access/lat/10yr_catalog/gll_psc_v27.fit"
)
FITS_LOCAL = FILES_DIR / "gll_psc_v27.fit"

BAND_EDGES = [
    (1,  50,      100),
    (2,  100,     300),
    (3,  300,     1_000),
    (4,  1_000,   3_000),
    (5,  3_000,   10_000),
    (6,  10_000,  100_000),
    (7,  100_000, 1_000_000),
]


def _f(val) -> float | None:
    """FITS value → Python float, NaN/Inf → None."""
    try:
        v = float(val)
        return None if (math.isnan(v) or math.isinf(v)) else v
    except (TypeError, ValueError):
        return None


def _s(val) -> str:
    return str(val).strip() if val is not None else ""


class FermiDataImporter:
    """
    Pobiera plik FITS katalogu Fermi-LAT 4FGL, parsuje dane
    i zapisuje je do bazy danych Django (FermiSource + SedPoint).

    Przykład:
        importer = FermiDataImporter()
        importer.run()

        # lub z własną ścieżką / URL:
        importer = FermiDataImporter(fits_path="moj_katalog.fit")
        importer.run()
    """

    def __init__(
        self,
        fits_path: str = FITS_LOCAL,
        fits_url: str = FITS_URL,
        batch_size: int = 500,
        stdout=None,
    ):
        self.fits_path = fits_path
        self.fits_url = fits_url
        self.batch_size = batch_size
        self._out = stdout

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run(self) -> None:
        self._download()
        table = self._parse()
        self._save(table)

    # ------------------------------------------------------------------
    # Step 1 – pobieranie pliku
    # ------------------------------------------------------------------

    def _download(self) -> None:
        if os.path.exists(self.fits_path):
            self._log(f"[✓] Plik już istnieje: {self.fits_path}")
            return

        self._log(f"[↓] Pobieranie: {self.fits_url}")
        response = requests.get(self.fits_url, stream=True, timeout=120)
        response.raise_for_status()

        total = int(response.headers.get("content-length", 0))
        downloaded = 0

        with open(self.fits_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=1 << 20):
                f.write(chunk)
                downloaded += len(chunk)
                if total:
                    self._log(f"  {downloaded / total * 100:.1f}%\r", ending="")

        self._log(f"\n[✓] Zapisano: {self.fits_path} ({downloaded / 1e6:.1f} MB)")

    # ------------------------------------------------------------------
    # Step 2 – parsowanie FITS
    # ------------------------------------------------------------------

    def _parse(self) -> Table:
        self._log(f"[→] Parsowanie FITS: {self.fits_path}")
        table = Table.read(self.fits_path, hdu=1)
        self._log(f"    Źródeł: {len(table)}")
        return table

    # ------------------------------------------------------------------
    # Step 3 – zapis do bazy
    # ------------------------------------------------------------------

    @transaction.atomic
    def _save(self, table: Table) -> None:
        cols = set(table.colnames)
        created_count = updated_count = 0

        for i, row in enumerate(table):
            source, created = FermiSource.objects.update_or_create(
                source_name=_s(row["Source_Name"]),
                defaults=self._source_defaults(row, cols),
            )

            source.sed_points.all().delete()
            SedPoint.objects.bulk_create(
                self._sed_points(source, row, cols)
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

            if (i + 1) % self.batch_size == 0:
                self._log(f"  [{i + 1}/{len(table)}] przetworzonych…")

        self._log(
            f"[✓] Gotowe: {created_count} nowych, {updated_count} zaktualizowanych."
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _source_defaults(self, row, cols: set) -> dict:
        return {
            "source_class":       _s(row["CLASS1"])                   if "CLASS1"           in cols else "",
            "associated_name":    _s(row["ASSOC1"])                   if "ASSOC1"           in cols else "",
            "ra":                 float(row["RAJ2000"]),
            "dec":                float(row["DEJ2000"]),
            "glon":               float(row["GLON"]),
            "glat":               float(row["GLAT"]),
            "pos_err_semi_major": _f(row["Conf_95_SemiMajor"])        if "Conf_95_SemiMajor" in cols else None,
            "pos_err_semi_minor": _f(row["Conf_95_SemiMinor"])        if "Conf_95_SemiMinor" in cols else None,
            "pos_err_angle":      _f(row["Conf_95_PosAng"])           if "Conf_95_PosAng"    in cols else None,
            "flux1000":           _f(row["Flux1000"])                 if "Flux1000"          in cols else None,
            "flux1000_err":       _f(row["Unc_Flux1000"])             if "Unc_Flux1000"      in cols else None,
            "significance":       _f(row["Signif_Avg"])               if "Signif_Avg"        in cols else None,
            "ts":                 _f(row["Test_Statistic"])           if "Test_Statistic"    in cols else None,
            "spectral_type":      _s(row["SpectrumType"])             if "SpectrumType"      in cols else "",
            "pivot_energy":       _f(row["Pivot_Energy"])             if "Pivot_Energy"      in cols else None,
            "spectral_index":     _f(row["PL_Index"])                 if "PL_Index"          in cols else None,
            "spectral_index_err": _f(row["Unc_PL_Index"])             if "Unc_PL_Index"      in cols else None,
            "redshift":           _f(row["Redshift"])                 if "Redshift"          in cols else None,
            "variability_index":  _f(row["Variability_Index"])        if "Variability_Index" in cols else None,
            "is_variable":        bool(int(row["Flags"]) & (1 << 2)) if "Flags"             in cols else False,
            "flags":              int(row["Flags"])                   if "Flags"             in cols else 0,
            "data_release":       int(row["DataRelease"])             if "DataRelease"       in cols else 2,
        }

    def _sed_points(self, source: FermiSource, row, cols: set) -> list[SedPoint]:
        flux_band = np.array(row["Flux_Band"],     dtype=float) if "Flux_Band"     in cols else None
        unc_band  = np.array(row["Unc_Flux_Band"], dtype=float) if "Unc_Flux_Band" in cols else None

        points = []
        for band_idx, e_min, e_max in BAND_EDGES:
            i = band_idx - 1
            flux = err_lo = err_hi = None

            if flux_band is not None and i < len(flux_band):
                flux = _f(flux_band[i])

            if unc_band is not None and i < len(unc_band):
                unc = np.atleast_1d(unc_band[i])
                if unc.shape == (2,):               # asymetryczne [−σ, +σ]
                    err_lo = abs(_f(unc[0]) or 0.0)
                    err_hi = abs(_f(unc[1]) or 0.0)
                else:                               # symetryczne
                    v = abs(_f(unc[0]) or 0.0)
                    err_lo = err_hi = v

            points.append(SedPoint(
                source=source,
                band=band_idx,
                e_min=e_min,
                e_max=e_max,
                e_center=math.sqrt(e_min * e_max),
                flux=flux,
                err_lo=err_lo,
                err_hi=err_hi,
                is_upper_limit=flux is not None and flux <= 0,
            ))

        return points

    def _log(self, msg: str, ending: str = "\n") -> None:
        if self._out:
            self._out.write(msg, ending=ending)
