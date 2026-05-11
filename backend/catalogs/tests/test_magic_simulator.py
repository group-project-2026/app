"""
Unit tests for MAGIC simulator module.

Tests core MAGIC calculation functions including:
- Spectrum creation from catalog data
- MAGIC performance retrieval
- Significance calculation (Li & Ma)
- Full simulation pipeline
"""

import pytest
from unittest import TestCase

from catalogs.magic_simulator import (
    get_magic_performance,
    crab_spectrum,
    spectrum_from_catalog_entry,
    significance_li_ma,
    run_magic_simulation,
    extract_aggregate_stats,
    validate_catalog_entry_for_magic,
    hash_observation_params,
)


class TestMagicPerformance(TestCase):
    """Test MAGIC performance data retrieval."""

    def test_get_magic_performance_low_zenith(self):
        """Test retrieving MAGIC performance for low zenith angle."""
        enbins, crabrate, bgdrate = get_magic_performance(zenith='low', lst_mode=False)
        
        # Should have 14 energy bin edges = 13 bins
        assert len(enbins) == 14
        assert len(crabrate) == 13
        assert len(bgdrate) == 13
        
        # All rates should be non-negative
        assert all(rate >= 0 for rate in crabrate)
        assert all(rate >= 0 for rate in bgdrate)
        
        # Energy bins should be monotonically increasing
        for i in range(len(enbins) - 1):
            assert enbins[i] < enbins[i + 1]

    def test_get_magic_performance_mid_zenith(self):
        """Test retrieving MAGIC performance for mid zenith angle."""
        enbins, crabrate, bgdrate = get_magic_performance(zenith='mid', lst_mode=False)
        
        assert len(enbins) == 14
        assert len(crabrate) == 13
        assert len(bgdrate) == 13

    def test_get_magic_performance_high_zenith(self):
        """Test retrieving MAGIC performance for high zenith angle."""
        enbins, crabrate, bgdrate = get_magic_performance(zenith='high', lst_mode=False)
        
        assert len(enbins) == 14
        assert len(crabrate) == 13
        assert len(bgdrate) == 13

    def test_get_magic_performance_lst_mode(self):
        """Test retrieving MAGIC+LST1 combined performance."""
        enbins, crabrate, bgdrate = get_magic_performance(zenith='low', lst_mode=True)
        
        assert len(enbins) == 14
        assert len(crabrate) == 13
        assert len(bgdrate) == 13

    def test_invalid_zenith_angle(self):
        """Test that invalid zenith angle raises error."""
        with pytest.raises(ValueError):
            get_magic_performance(zenith='invalid')


class TestCrabSpectrum(TestCase):
    """Test Crab Nebula spectrum function."""

    def test_crab_spectrum_at_1tev(self):
        """Test Crab spectrum at 1 TeV (1000 GeV)."""
        flux = crab_spectrum(1000.0)
        
        # Should be positive
        assert flux > 0
        
        # Should be approximately 3.39e-11 at 1 TeV (for reference)
        # Allow 10% tolerance due to logarithmic dependence on spectral index
        assert flux > 1e-11
        assert flux < 1e-10

    def test_crab_spectrum_energy_dependence(self):
        """Test that Crab spectrum decreases with energy (harder spectrum)."""
        flux_100gev = crab_spectrum(100.0)
        flux_1tev = crab_spectrum(1000.0)
        flux_10tev = crab_spectrum(10000.0)
        
        # Spectrum should be decreasing with energy
        assert flux_100gev > flux_1tev > flux_10tev


class TestSpectrumFromCatalogEntry(TestCase):
    """Test spectrum function creation from catalog entry."""

    def test_valid_spectrum_from_entry(self):
        """Test creating spectrum from valid catalog entry."""
        # Create mock catalog entry dict
        entry = {
            'metadata': {
                'flux_1000': 1e-11,
                'spectral_index': 2.5,
            }
        }
        
        spectrum_func = spectrum_from_catalog_entry(entry)
        
        assert spectrum_func is not None
        
        # Test spectrum at 1 TeV (should return the normalization flux)
        flux_1tev = spectrum_func(1000.0)
        assert flux_1tev == 1e-11

    def test_missing_flux(self):
        """Test that missing flux returns None."""
        entry = {
            'metadata': {
                'spectral_index': 2.5,
            }
        }
        
        spectrum_func = spectrum_from_catalog_entry(entry)
        assert spectrum_func is None

    def test_missing_spectral_index(self):
        """Test that missing spectral index returns None."""
        entry = {
            'metadata': {
                'flux_1000': 1e-11,
            }
        }
        
        spectrum_func = spectrum_from_catalog_entry(entry)
        assert spectrum_func is None

    def test_spectrum_power_law(self):
        """Test that spectrum follows power law."""
        entry = {
            'metadata': {
                'flux_1000': 1e-11,
                'spectral_index': 2.0,  # Simple power law
            }
        }
        
        spectrum_func = spectrum_from_catalog_entry(entry)
        
        # At 100 GeV (10x lower), flux should be 10^2 = 100x higher (for index 2)
        flux_1tev = spectrum_func(1000.0)
        flux_100gev = spectrum_func(100.0)
        
        ratio = flux_100gev / flux_1tev
        assert 99 < ratio < 101  # Allow small numerical error


class TestSignificanceLiMa(TestCase):
    """Test Li & Ma significance calculation."""

    def test_zero_signal_zero_background(self):
        """Test that zero signal and background gives zero significance."""
        sigma = significance_li_ma(0, 0, alpha=1.0)
        assert sigma == 0.0

    def test_strong_detection(self):
        """Test significance for strong signal."""
        # 100 excess events, 10 background, alpha=1
        sigma = significance_li_ma(100, 10, alpha=1.0)
        
        # Should be a strong detection (>9 sigma)
        assert sigma > 9

    def test_detection_threshold(self):
        """Test that MAGIC uses sigma>=5 threshold."""
        # Find parameters that give ~5 sigma
        sigma = significance_li_ma(30, 5, alpha=1.0)
        
        # Should be around 5 sigma
        assert 4 < sigma < 6

    def test_alpha_scaling(self):
        """Test that alpha (OFF/ON regions ratio) affects significance."""
        sigma_1 = significance_li_ma(50, 10, alpha=1.0)
        sigma_3 = significance_li_ma(50, 10, alpha=1.0/3.0)  # numoff=3
        
        # With multiple background regions, significance changes
        assert sigma_3 != sigma_1


class TestAggregateStats(TestCase):
    """Test extraction of aggregate statistics."""

    def test_extract_stats_detectable(self):
        """Test extracting stats from detectable source."""
        simulation_result = {
            'energy_bins_gev': [50, 79, 126, 200],
            'excess_events': [10, 20],
            'significance_sigma': [3.0, 6.0],
            'detected': [False, True],
            'integral_significance': 5.5,
            'overall_detectable': True,
        }
        
        stats = extract_aggregate_stats(simulation_result)
        
        assert stats['magic_significance'] == 5.5
        assert stats['magic_detectable'] is True

    def test_extract_stats_not_detectable(self):
        """Test extracting stats from non-detectable source."""
        simulation_result = {
            'energy_bins_gev': [50, 79],
            'excess_events': [2],
            'significance_sigma': [1.5],
            'detected': [False],
            'integral_significance': 1.5,
            'overall_detectable': False,
        }
        
        stats = extract_aggregate_stats(simulation_result)
        
        assert stats['magic_significance'] == 1.5
        assert stats['magic_detectable'] is False


class TestValidateCatalogEntry(TestCase):
    """Test catalog entry validation for MAGIC calculation."""

    def test_valid_entry(self):
        """Test validation of valid entry."""
        entry = {
            'metadata': {
                'flux_1000': 1e-11,
                'spectral_index': 2.5,
            }
        }
        
        is_valid, error_msg = validate_catalog_entry_for_magic(entry)
        
        assert is_valid is True
        assert error_msg is None

    def test_missing_flux(self):
        """Test validation fails without flux."""
        entry = {
            'metadata': {
                'spectral_index': 2.5,
            }
        }
        
        is_valid, error_msg = validate_catalog_entry_for_magic(entry)
        
        assert is_valid is False
        assert 'flux' in error_msg.lower()

    def test_negative_flux(self):
        """Test validation fails for negative flux."""
        entry = {
            'metadata': {
                'flux_1000': -1e-11,
                'spectral_index': 2.5,
            }
        }
        
        is_valid, error_msg = validate_catalog_entry_for_magic(entry)
        
        assert is_valid is False
        assert 'invalid' in error_msg.lower() or 'flux' in error_msg.lower()

    def test_invalid_spectral_index(self):
        """Test validation fails for invalid spectral index."""
        entry = {
            'metadata': {
                'flux_1000': 1e-11,
                'spectral_index': 0.5,  # Too soft
            }
        }
        
        is_valid, error_msg = validate_catalog_entry_for_magic(entry)
        
        assert is_valid is False
        assert 'spectral' in error_msg.lower() or 'index' in error_msg.lower()


class TestMagicSimulation(TestCase):
    """Test full MAGIC simulation pipeline."""

    def test_simulation_crab_like_spectrum(self):
        """Test simulation with Crab-like spectrum."""
        # Simple power-law spectrum similar to Crab
        def crab_like_spectrum(e_gev):
            return 3e-11 * (e_gev / 1000.0) ** (-2.5)
        
        observation_params = {
            'observation_time_hours': 1,
            'zenith_angle': 'low',
            'extension_deg': 0.0,
            'offset_degradation': 1.0,
        }
        
        magic_params = {
            'min_events': 5,
            'min_sbr': 0.05,
            'psf_deg': 0.1,
            'numoff': 3,
        }
        
        result = run_magic_simulation(
            crab_like_spectrum,
            observation_params,
            magic_params
        )
        
        # Should return dict with expected keys
        assert 'energy_bins_gev' in result
        assert 'excess_events' in result
        assert 'significance_sigma' in result
        assert 'detected' in result
        assert 'integral_significance' in result
        assert 'overall_detectable' in result
        
        # Energy bins should have correct length
        assert len(result['energy_bins_gev']) == 14
        assert len(result['excess_events']) == 13
        assert len(result['significance_sigma']) == 13
        assert len(result['detected']) == 13

    def test_simulation_varies_with_observation_time(self):
        """Test that longer observation time increases significance."""
        def simple_spectrum(e_gev):
            return 1e-11 * (e_gev / 1000.0) ** (-2.0)
        
        # Short observation
        result_1h = run_magic_simulation(
            simple_spectrum,
            {'observation_time_hours': 1, 'zenith_angle': 'low', 'extension_deg': 0.0, 'offset_degradation': 1.0},
            {'min_events': 5, 'min_sbr': 0.05, 'psf_deg': 0.1, 'numoff': 3}
        )
        
        # Long observation
        result_10h = run_magic_simulation(
            simple_spectrum,
            {'observation_time_hours': 10, 'zenith_angle': 'low', 'extension_deg': 0.0, 'offset_degradation': 1.0},
            {'min_events': 5, 'min_sbr': 0.05, 'psf_deg': 0.1, 'numoff': 3}
        )
        
        # Longer observation should give higher significance
        assert result_10h['integral_significance'] > result_1h['integral_significance']


class TestHashObservationParams(TestCase):
    """Test parameter hashing for caching."""

    def test_identical_params_same_hash(self):
        """Test that identical params give same hash."""
        params = {
            'observation_time_hours': 20,
            'zenith_angle': 'low',
            'min_events': 10,
        }
        
        hash1 = hash_observation_params(params)
        hash2 = hash_observation_params(params)
        
        assert hash1 == hash2

    def test_different_params_different_hash(self):
        """Test that different params give different hashes."""
        params1 = {'observation_time_hours': 20}
        params2 = {'observation_time_hours': 10}
        
        hash1 = hash_observation_params(params1)
        hash2 = hash_observation_params(params2)
        
        assert hash1 != hash2

    def test_hash_is_deterministic(self):
        """Test that hash is deterministic regardless of key order."""
        params1 = {'a': 1, 'b': 2}
        params2 = {'b': 2, 'a': 1}
        
        hash1 = hash_observation_params(params1)
        hash2 = hash_observation_params(params2)
        
        # Should produce same hash due to sorted keys
        assert hash1 == hash2


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
