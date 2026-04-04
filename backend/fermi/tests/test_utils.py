"""Tests for HEALPix spatial utilities."""

import numpy as np
import pytest

from fermi.data_catalogues.utils import (
    NSIDE,
    angular_separation_deg,
    compute_healpix,
    cone_pixels,
)


def test_compute_healpix_returns_integer():
    result = compute_healpix(83.822, -5.391)
    assert isinstance(result, int)
    assert result >= 0


def test_compute_healpix_known_point_stable():
    # Same input always produces the same pixel
    assert compute_healpix(0.0, 0.0) == compute_healpix(0.0, 0.0)
    assert compute_healpix(180.0, 45.0) == compute_healpix(180.0, 45.0)


def test_compute_healpix_different_points_different_pixels():
    # Two points 5 degrees apart must not map to the same pixel at nside=4096
    p1 = compute_healpix(0.0, 0.0)
    p2 = compute_healpix(5.0, 0.0)
    assert p1 != p2


def test_cone_pixels_contains_center():
    ra, dec, radius = 83.822, -5.391, 0.5
    center_pixel = compute_healpix(ra, dec)
    pixels = cone_pixels(ra, dec, radius)
    assert center_pixel in pixels


def test_cone_pixels_returns_list_of_ints():
    pixels = cone_pixels(0.0, 0.0, 0.1)
    assert isinstance(pixels, list)
    assert all(isinstance(p, (int, np.integer)) for p in pixels)


def test_cone_pixels_larger_radius_more_pixels():
    small = cone_pixels(0.0, 0.0, 0.1)
    large = cone_pixels(0.0, 0.0, 1.0)
    assert len(large) > len(small)


def test_angular_separation_zero():
    assert angular_separation_deg(10.0, 20.0, 10.0, 20.0) == pytest.approx(0.0, abs=1e-10)


def test_angular_separation_known():
    # One degree apart in dec at equator should be ~1 degree
    sep = angular_separation_deg(0.0, 0.0, 0.0, 1.0)
    assert sep == pytest.approx(1.0, rel=1e-4)


def test_angular_separation_symmetry():
    sep_ab = angular_separation_deg(10.0, 20.0, 15.0, 25.0)
    sep_ba = angular_separation_deg(15.0, 25.0, 10.0, 20.0)
    assert sep_ab == pytest.approx(sep_ba, rel=1e-10)
