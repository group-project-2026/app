import numpy as np
import healpy as hp

NSIDE = 4096


def compute_healpix(ra_deg: float, dec_deg: float) -> int:
    """Convert RA/Dec (ICRS degrees) to HEALPix pixel id, NESTED ordering."""
    theta = np.radians(90.0 - dec_deg)  # colatitude
    phi = np.radians(ra_deg)
    return int(hp.ang2pix(NSIDE, theta, phi, nest=True))


def cone_pixels(ra_deg: float, dec_deg: float, radius_deg: float) -> list[int]:
    """Return all HEALPix pixel ids (NESTED, nside=4096) within radius of point."""
    vec = hp.ang2vec(np.radians(90.0 - dec_deg), np.radians(ra_deg))
    return hp.query_disc(NSIDE, vec, np.radians(radius_deg), nest=True).tolist()


def angular_separation_deg(ra1: float, dec1: float, ra2: float, dec2: float) -> float:
    """Angular separation between two points on the sphere (haversine formula)."""
    ra1, dec1, ra2, dec2 = map(np.radians, [ra1, dec1, ra2, dec2])
    dra = ra2 - ra1
    ddec = dec2 - dec1
    a = np.sin(ddec / 2) ** 2 + np.cos(dec1) * np.cos(dec2) * np.sin(dra / 2) ** 2
    return float(np.degrees(2 * np.arcsin(np.sqrt(a))))
