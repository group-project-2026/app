"""
MAGIC Source Simulator Wrapper

Refactored from mss.py (MAGIC project) for integration with Django backend.
Provides importable functions for spectrum building and MAGIC detectability simulation.

References:
- Aleksic, J., et al., 2016, Astroparticle Physics, 72, 76
- Li & Ma 1983, ApJ, 272, 317 (significance calculation)
- mss.cpp version 1.9 (2024/10/25)

Key Changes from mss.py:
- No matplotlib/pyplot calls (returns raw data only)
- No global state
- All parameters explicit (zenith, time, PSF, etc.)
- Importable functions with clear signatures
"""

import numpy as np
from scipy.integrate import quad
from typing import Dict, Any, Tuple, Optional, Callable


# ============================================================================
# CRAB NEBULA REFERENCE SPECTRUM (Aleksic et al. 2016)
# ============================================================================


def crab_spectrum(energy_gev: float) -> float:
    """
    Crab Nebula spectrum from Aleksic et al. 2016.

    Args:
        energy_gev: Energy in GeV

    Returns:
        Flux in [cm^-2 s^-1 TeV^-1]
    """
    return 3.39e-11 * pow(
        energy_gev / 1000.0, -2.51 - 0.21 * np.log10(energy_gev / 1000.0)
    )


# ============================================================================
# ZENITH ANGLE PERFORMANCE DATA
# ============================================================================


class MAGICPerformanceData:
    """MAGIC telescope performance data for different zenith angle ranges."""

    @staticmethod
    def get_performance(zenith: str) -> Tuple[np.ndarray, np.ndarray, np.ndarray, bool]:
        """
        Get MAGIC performance curves for given zenith angle.

        Args:
            zenith: 'low' (0-30°), 'mid' (30-45°), or 'high' (~60°)

        Returns:
            Tuple of (crabrate, bgdrate, enbins, is_mc):
                crabrate: Signal rate in min^-1 for Crab per energy bin
                bgdrate: Background rate in min^-1 per energy bin
                enbins: Energy bin edges in GeV (npoints+1,)
                is_mc: True if data from Monte Carlo (less reliable)
        """

        npoints = 13
        enbins = np.zeros(npoints + 1)
        crabrate = np.zeros(npoints)
        bgdrate = np.zeros(npoints)

        # Energy bins: 100 * 10^((i-2)*0.2) for i in 0..13
        npoints_array = np.arange(0, npoints + 1)
        enbins = 100.0 * np.power(10.0, (npoints_array - 2) * 0.2)

        is_mc = False

        if zenith == "low":
            # Aleksic et al 2016 data (0-30° zenith angle)
            crabrate[:] = [
                0.3795,
                2.5808,
                2.8257,
                1.6654,
                1.3289,
                1.2871,
                0.8834,
                0.7045,
                0.3908,
                0.1963,
                0.089,
                0.0368,
                0.0,
            ]
            bgdrate[:] = [
                0.88870e00,
                1.6505e00,
                5.7688e-01,
                5.0804e-02,
                2.0521e-02,
                2.1718e-02,
                5.6106e-03,
                3.9491e-03,
                3.2053e-03,
                1.8074e-03,
                7.3253e-04,
                1.1352e-05,
                0.0,
            ]
            is_mc = True

        elif zenith == "mid":
            # Aleksic et al 2016 data (30-45° zenith angle)
            crabrate[:] = [
                0.0,
                0.404836,
                3.17608,
                2.67108,
                2.86307,
                1.76124,
                1.43988,
                0.944385,
                0.673335,
                0.316263,
                0.200331,
                0.0991222,
                0.0289831,
            ]
            bgdrate[:] = [
                1.67777,
                2.91732,
                2.91988,
                0.680319,
                0.0921932,
                0.0203476,
                0.00893356,
                0.00971799,
                0.00234261,
                0.000665438,
                0.00138165,
                0.00147903,
                0.000870903,
            ]

        elif zenith == "high":
            # High zenith angle data (~55-62°)
            crabrate[:] = [
                0.0,
                0.0,
                0.0,
                0.0,
                0.503462,
                1.60232,
                2.26558,
                0.928094,
                0.698335,
                0.305662,
                0.173859,
                0.083892,
                0.069938,
            ]
            bgdrate[:] = [
                0.0,
                0.0,
                0.0,
                0.0,
                0.750815,
                0.597588,
                0.564753,
                0.089775,
                0.0568584,
                0.00954936,
                0.00344762,
                0.00147755,
                0.00229841,
            ]
            is_mc = False
        else:
            raise ValueError(
                f"Unknown zenith angle: {zenith}. Use 'low', 'mid', or 'high'."
            )

        return crabrate, bgdrate, enbins, is_mc


# ============================================================================
# SPECTRUM BUILDING FROM CATALOG METADATA
# ============================================================================


def build_spectrum_function(
    spectral_index: float,
    flux_norm_tev: float,
    norm_energy_tev: float = 1.0,
    cutoff_energy_tev: Optional[float] = None,
) -> Callable[[float], float]:
    """
    Build a spectral flux function from catalog metadata.

    Supports:
    - Pure power-law: F(E) = F0 * (E / E_norm)^(-index)
    - Power-law with exponential cutoff: F(E) = F0 * (E / E_norm)^(-index) * exp(-E / E_cut)

    Args:
        spectral_index: Spectral index (typically 1.5-3.5 for gamma-ray sources)
        flux_norm_tev: Flux normalization at norm_energy (in [cm^-2 s^-1 TeV^-1])
        norm_energy_tev: Normalization energy (default 1 TeV)
        cutoff_energy_tev: Optional exponential cutoff energy. If None, pure power-law.

    Returns:
        Function E [GeV] -> flux [cm^-2 s^-1 TeV^-1]
    """

    if spectral_index <= 0:
        raise ValueError(f"Spectral index must be positive, got {spectral_index}")
    if flux_norm_tev < 0:
        raise ValueError(
            f"Flux normalization must be non-negative, got {flux_norm_tev}"
        )

    norm_energy_gev = norm_energy_tev * 1000.0

    if cutoff_energy_tev is None:
        # Pure power-law
        def spectrum(energy_gev: float) -> float:
            if energy_gev <= 0:
                return 0.0
            return flux_norm_tev * pow(energy_gev / norm_energy_gev, -spectral_index)

    else:
        # Power-law with exponential cutoff
        cutoff_energy_gev = cutoff_energy_tev * 1000.0

        def spectrum(energy_gev: float) -> float:
            if energy_gev <= 0:
                return 0.0
            return (
                flux_norm_tev
                * pow(energy_gev / norm_energy_gev, -spectral_index)
                * np.exp(-energy_gev / cutoff_energy_gev)
            )

    return spectrum


def build_spectrum_from_catalog(
    metadata: Dict[str, Any]
) -> Optional[Callable[[float], float]]:
    """
    Build spectrum function from catalog entry metadata.

    Extracts spectral_index, flux, and optional cutoff from metadata dict.
    Returns None if essential data is missing.

    Args:
        metadata: Dictionary with keys like 'spectral_index', 'flux_tev', 'flux_1tev', etc.

    Returns:
        Spectrum function or None if data incomplete
    """

    # Extract spectral index
    spectral_index = metadata.get("spectral_index")
    if spectral_index is None:
        return None

    try:
        spectral_index = float(spectral_index)
    except (TypeError, ValueError):
        return None

    # Extract flux at reference energy (try multiple keys)
    flux_tev = None
    norm_energy_tev = None

    for flux_key, norm_energy in [
        ("flux_1tev", 1.0),
        ("flux_tev", 1.0),
        ("flux1000", 1.0),  # Fermi: 1000 MeV = 1 TeV
        ("flux_1000", 1.0),
    ]:
        if flux_key in metadata:
            try:
                val = float(metadata[flux_key])
                if val > 0:
                    flux_tev = val
                    norm_energy_tev = norm_energy
                    break
            except (TypeError, ValueError):
                continue

    if flux_tev is None or flux_tev <= 0:
        return None

    # Extract optional cutoff energy
    cutoff_tev = None
    for cutoff_key in ["cutoff_energy_tev", "cutoff_energy_gev", "exp_cutoff_tev"]:
        if cutoff_key in metadata:
            try:
                cutoff_tev = float(metadata[cutoff_key])
                if cutoff_tev > 0 and cutoff_tev < 1e6:  # Sanity check
                    break
            except (TypeError, ValueError):
                continue

    try:
        return build_spectrum_function(
            spectral_index=spectral_index,
            flux_norm_tev=flux_tev,
            norm_energy_tev=norm_energy_tev,
            cutoff_energy_tev=cutoff_tev,
        )
    except ValueError:
        return None


# ============================================================================
# LI & MA SIGNIFICANCE CALCULATION
# ============================================================================


def significance_li_ma(signal: float, background: float, alpha: float = 1.0) -> float:
    """
    Li & Ma 1983 significance calculation (Eq. 17).

    Args:
        signal: Number of excess events (on-source counts)
        background: Number of background events (off-source counts)
        alpha: Ratio of on-source to off-source exposure (default 1.0)

    Returns:
        Significance in sigma (sqrt(2*log_likelihood))
    """

    if signal < 0.001 or background < 0.001:
        return 0.0

    # Handle zero values safely
    if signal == 0 and background == 0:
        return 0.0

    if background == 0:
        background = 0.001
    if signal == 0:
        signal = 0.001

    sum_sb = signal + background

    if sum_sb < 0 or alpha <= 0:
        return -1.0

    l = signal * np.log((signal / sum_sb) * (alpha + 1) / alpha)
    m = background * np.log((background / sum_sb) * (alpha + 1))

    log_likelihood = l + m

    if log_likelihood < 0:
        return 0.0

    return np.sqrt(2 * log_likelihood)


# ============================================================================
# MAIN SIMULATION ENGINE
# ============================================================================


def run_mss_simulation(
    spectrum_func: Callable[[float], float],
    observation_time_hours: float = 20.0,
    zenith_angle: str = "low",
    psf_deg: float = 0.1,
    extension_deg: float = 0.0,
    offset_degrad: float = 1.0,
    num_off_regions: int = 3,
    min_events: int = 10,
    min_sbr: float = 0.05,
    pulsar_mode: bool = False,
) -> Dict[str, Any]:
    """
    Run MAGIC source simulator for a given spectrum.

    Calculates detectability statistics and spectral points following MAGIC performance.
    Returns raw data suitable for plotting (not images).

    Args:
        spectrum_func: Callable that returns flux [cm^-2 s^-1 TeV^-1] for energy [GeV]
        observation_time_hours: Observation time in hours (default 20)
        zenith_angle: 'low', 'mid', or 'high' (default 'low')
        psf_deg: Point spread function size in degrees (default 0.1)
        extension_deg: Source extension radius in degrees (default 0.0)
        offset_degrad: Performance degradation factor for off-axis observations (default 1.0, no degradation)
        num_off_regions: Number of background estimation regions (default 3)
        min_events: Minimum excess events for detection (default 10)
        min_sbr: Minimum signal-to-background ratio (default 0.05 = 5%)
        pulsar_mode: Enable pulsar mode with phase windows (default False)

    Returns:
        Dictionary with simulation results:
        {
            'parameters': {...observation parameters...},
            'energy_bins': {...energy bin information...},
            'spectral_points': [...list of detections...],
            'aggregate_stats': {...overall significance, detection probability...},
            'spectrum_model': {...spectral model parameters...},
        }
    """

    # Validate inputs
    if observation_time_hours <= 0:
        raise ValueError(
            f"observation_time_hours must be positive, got {observation_time_hours}"
        )
    if psf_deg < 0 or extension_deg < 0:
        raise ValueError("PSF and extension must be non-negative")
    if extension_deg > 1.0:
        raise ValueError(
            "Extension must be < 1 degree (not implemented for large extensions)"
        )
    if offset_degrad > 1.0 or offset_degrad <= 0:
        raise ValueError(f"offset_degrad must be in (0, 1], got {offset_degrad}")
    if num_off_regions < 1 or num_off_regions > 7:
        raise ValueError(f"num_off_regions must be in [1, 7], got {num_off_regions}")

    # Get performance data
    crabrate, bgdrate, enbins, is_mc = MAGICPerformanceData.get_performance(
        zenith_angle
    )

    # Apply offset degradation
    crabrate = crabrate * offset_degrad
    bgdrate = bgdrate * offset_degrad

    npoints = len(crabrate)
    obs_time_minutes = observation_time_hours * 60.0

    # Storage for results
    spectral_points = []
    detected_count = 0
    nexc_all = 0.0
    noff_all = 0.0

    # Process each energy bin
    for i in range(npoints):
        e1, e2 = enbins[i], enbins[i + 1]
        e_center = np.sqrt(e1 * e2)  # Geometric mean

        # Integrate fluxes over energy bin
        try:
            crab_flux_integral, _ = quad(crab_spectrum, e1, e2)
            source_flux_integral, _ = quad(spectrum_func, e1, e2)
        except Exception:
            # Integration failed, skip this bin
            continue

        if crab_flux_integral <= 0:
            continue

        # Calculate excess events
        nexc = (
            crabrate[i] * obs_time_minutes * (source_flux_integral / crab_flux_integral)
        )

        # Calculate background events (with extension correction)
        noff = bgdrate[i] * obs_time_minutes
        noff *= (psf_deg * psf_deg + extension_deg * extension_deg) / (
            psf_deg * psf_deg
        )

        # Background error
        dnoff = np.sqrt(noff / num_off_regions)

        # Excess error
        dexc = np.sqrt(nexc + noff + dnoff * dnoff)

        # Calculate significance
        sigma = 0.0
        if nexc > 0.01:
            sigma = significance_li_ma(nexc, noff, alpha=num_off_regions)

        # Detection criterion
        is_detected = (
            (sigma >= 5.0 and nexc / noff > min_sbr and nexc > min_events)
            if noff > 0
            else False
        )

        nexc_all += nexc
        noff_all += noff
        if is_detected:
            detected_count += 1

        # Convert flux to SED format: E^2 dN/dE [TeV cm^-2 s^-1]
        flux_sed = 1.0e-6 * e_center * e_center * source_flux_integral
        flux_sed_err = flux_sed * (dexc / nexc) if nexc > 0.01 else 0.0

        sbr = (nexc / noff * 100.0) if noff > 0 else np.nan

        spectral_points.append(
            {
                "energy_gev": float(e_center),
                "energy_bin_lower_gev": float(e1),
                "energy_bin_upper_gev": float(e2),
                "flux_sed_tev_cm2_s": float(flux_sed),
                "flux_sed_error": float(flux_sed_err),
                "excess_events": float(nexc),
                "excess_error": float(dexc),
                "background_events": float(noff),
                "background_error": float(dnoff),
                "significance_sigma": float(sigma),
                "signal_to_background_ratio_percent": float(sbr),
                "is_detected": bool(is_detected),
            }
        )

    # Calculate aggregate statistics
    aggregate_sigma = 0.0
    if nexc_all > 0.01 and noff_all > 0.001:
        # Combined significance: roughly sum of sigmas / sqrt(N_bins)
        total_sigma = sum(sp.get("significance_sigma", 0) for sp in spectral_points)
        aggregate_sigma = (
            total_sigma / np.sqrt(len(spectral_points))
            if len(spectral_points) > 0
            else 0.0
        )

    detection_probability = min(1.0, max(0.0, aggregate_sigma / 5.0))  # Rough estimate

    return {
        "parameters": {
            "observation_time_hours": float(observation_time_hours),
            "zenith_angle": zenith_angle,
            "psf_deg": float(psf_deg),
            "extension_deg": float(extension_deg),
            "offset_degrad": float(offset_degrad),
            "num_off_regions": int(num_off_regions),
            "min_events": int(min_events),
            "min_sbr": float(min_sbr),
            "pulsar_mode": bool(pulsar_mode),
        },
        "energy_bins": {
            "lower_bounds_gev": [float(enbins[i]) for i in range(npoints)],
            "upper_bounds_gev": [float(enbins[i + 1]) for i in range(npoints)],
            "centers_gev": [
                float(np.sqrt(enbins[i] * enbins[i + 1])) for i in range(npoints)
            ],
        },
        "spectral_points": spectral_points,
        "aggregate_stats": {
            "total_significance": float(aggregate_sigma),
            "detection_probability": float(detection_probability),
            "detected_bins": int(detected_count),
            "total_bins_evaluated": len(spectral_points),
            "total_excess_events": float(nexc_all),
            "total_background_events": float(noff_all),
            "total_sbr_percent": (
                (nexc_all / noff_all * 100.0) if noff_all > 0 else np.nan
            ),
        },
        "metadata": {
            "version": "1.9 (refactored)",
            "reference": "Aleksic et al. 2016, Astroparticle Physics, 72, 76",
            "is_mc_based": bool(is_mc),
        },
    }


# ============================================================================
# CONVENIENCE WRAPPER FOR CATALOG INTEGRATION
# ============================================================================


def simulate_catalog_source(
    catalog_entry_metadata: Dict[str, Any],
    observation_time_hours: float = 20.0,
    zenith_angle: str = "low",
    **kwargs,
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Convenience function for simulating detectability of a catalog source.

    Extracts spectrum from metadata, runs simulation, and returns results or error.

    Args:
        catalog_entry_metadata: Metadata dict from CatalogEntry with spectral info
        observation_time_hours: Observation time in hours
        zenith_angle: 'low', 'mid', or 'high'
        **kwargs: Additional parameters for run_mss_simulation()

    Returns:
        Tuple of (results_dict, error_message):
            - results_dict: Full simulation output if successful
            - error_message: Human-readable error string if failed (None on success)
    """

    # Try to build spectrum from metadata
    spectrum = build_spectrum_from_catalog(catalog_entry_metadata)
    if spectrum is None:
        return None, "Incomplete spectral data (need spectral_index and flux)"

    # Run simulation
    try:
        results = run_mss_simulation(
            spectrum_func=spectrum,
            observation_time_hours=observation_time_hours,
            zenith_angle=zenith_angle,
            **kwargs,
        )
        return results, None
    except Exception as e:
        return None, f"Simulation error: {str(e)}"
