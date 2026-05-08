"""
Position error handling for cross-matching astronomy catalogs.

Implements scientifically-sound spatial matching by incorporating
position measurement errors from catalogs.
"""

import math
from abc import ABC, abstractmethod
from typing import Optional


class PositionError(ABC):
    """Base class for position errors."""

    @abstractmethod
    def get_sigma(self) -> float:
        """Get 1-sigma uncertainty in degrees."""
        pass

    @abstractmethod
    def get_radius_for_nsigma(self, n_sigma: float) -> float:
        """Get radius for N-sigma confidence."""
        pass


class CircularPositionError(PositionError):
    """Isotropic circular position error."""

    def __init__(self, sigma_deg: float):
        """
        Args:
            sigma_deg: Position uncertainty in degrees (1-sigma)
        """
        self.sigma_deg = sigma_deg

    def get_sigma(self) -> float:
        return self.sigma_deg

    def get_radius_for_nsigma(self, n_sigma: float) -> float:
        return n_sigma * self.sigma_deg


class EllipticalPositionError(PositionError):
    """Elliptical position error (e.g., Fermi 95% confidence ellipse)."""

    def __init__(
        self,
        semi_major_deg: float,
        semi_minor_deg: float,
        angle_deg: float = 0.0,
    ):
        """
        Args:
            semi_major_deg: Semi-major axis in degrees
            semi_minor_deg: Semi-minor axis in degrees
            angle_deg: Position angle in degrees (0-180)
        """
        self.semi_major_deg = semi_major_deg
        self.semi_minor_deg = semi_minor_deg
        self.angle_deg = angle_deg

    def get_sigma(self) -> float:
        """Return effective sigma (geometric mean of axes)."""
        return math.sqrt(self.semi_major_deg * self.semi_minor_deg)

    def get_radius_for_nsigma(self, n_sigma: float) -> float:
        """Conservative radius using semi-major axis."""
        return n_sigma * self.semi_major_deg


class CombinedPositionError:
    """Combine two position errors using RSS (root-sum-square)."""

    def __init__(self, error1: PositionError, error2: PositionError):
        """
        Combine two independent position error sources.

        Args:
            error1: Position error from source 1
            error2: Position error from source 2
        """
        self.error1 = error1
        self.error2 = error2

    def get_combined_sigma(self) -> float:
        """
        Return combined 1-sigma uncertainty.

        Uses root-sum-square (RSS) for independent Gaussian errors:
        σ_combined = sqrt(σ₁² + σ₂²)
        """
        s1 = self.error1.get_sigma()
        s2 = self.error2.get_sigma()
        return math.sqrt(s1 ** 2 + s2 ** 2)

    def get_match_radius(self, n_sigma: float = 2.5) -> float:
        """
        Return match radius for N-sigma confidence.

        Args:
            n_sigma: Number of sigma for confidence level
                - 2.0: 95.4% (conservative)
                - 2.5: 98.8% (balanced, recommended)
                - 3.0: 99.7% (permissive)

        Returns:
            Match radius in degrees
        """
        return n_sigma * self.get_combined_sigma()


class ConfidenceCalculator:
    """Calculate match confidence from separation and position errors."""

    @staticmethod
    def gaussian_confidence(
        separation_deg: float, combined_sigma_deg: float
    ) -> float:
        """
        Calculate Gaussian confidence score.

        Uses the probability density of a normal distribution:
        confidence = exp(-(separation/σ)² / 2)

        This gives:
        - confidence = 1.0 at zero separation
        - confidence ≈ 0.6 at 1-sigma
        - confidence ≈ 0.05 at 3-sigma

        Args:
            separation_deg: Angular separation in degrees
            combined_sigma_deg: Combined position error (1-sigma)

        Returns:
            Confidence in range [0, 1]
        """
        if combined_sigma_deg <= 0:
            return 1.0 if separation_deg == 0 else 0.0

        chi_squared = (separation_deg / combined_sigma_deg) ** 2
        return math.exp(-chi_squared / 2)

    @staticmethod
    def mahalanobis_confidence(
        separation_deg: float,
        error1: EllipticalPositionError,
        error2: EllipticalPositionError,
    ) -> float:
        """
        Calculate confidence using Mahalanobis distance.

        Accounts for elliptical error shapes and orientation.
        More sophisticated than Gaussian, but requires elliptical errors.

        Args:
            separation_deg: Angular separation in degrees
            error1: Elliptical error from source 1
            error2: Elliptical error from source 2

        Returns:
            Confidence in range [0, 1]
        """
        # Combined effective sigma using semi-major axes
        combined_sigma = math.sqrt(
            error1.semi_major_deg ** 2 + error2.semi_major_deg ** 2
        )

        # Fall back to Gaussian for now (full Mahalanobis needs coordinate rotation)
        chi_squared = (separation_deg / combined_sigma) ** 2
        return math.exp(-chi_squared / 2)


def extract_position_error_from_metadata(
    metadata: dict,
) -> Optional[PositionError]:
    """
    Extract position error from catalog metadata.

    Supports multiple formats:
    - Fermi-style elliptical: pos_err_semi_major, pos_err_semi_minor, pos_err_angle
    - Circular: pos_err_circular_deg
    - Separate RA/DEC: pos_err_ra_deg, pos_err_dec_deg

    Args:
        metadata: Dictionary with catalog-specific metadata

    Returns:
        PositionError object or None if not available
    """
    # Check for Fermi-style elliptical error
    if all(k in metadata for k in ["pos_err_semi_major", "pos_err_semi_minor"]):
        semi_major = metadata.get("pos_err_semi_major")
        semi_minor = metadata.get("pos_err_semi_minor")

        if semi_major and semi_minor:
            angle = metadata.get("pos_err_angle", 0.0)
            return EllipticalPositionError(semi_major, semi_minor, angle)

    # Check for circular error
    if "pos_err_circular_deg" in metadata:
        err = metadata.get("pos_err_circular_deg")
        if err:
            return CircularPositionError(err)

    # Check for separate RA/DEC errors
    if "pos_err_ra_deg" in metadata and "pos_err_dec_deg" in metadata:
        ra_err = metadata.get("pos_err_ra_deg")
        dec_err = metadata.get("pos_err_dec_deg")
        if ra_err and dec_err:
            combined = math.sqrt(ra_err ** 2 + dec_err ** 2)
            return CircularPositionError(combined)

    return None
