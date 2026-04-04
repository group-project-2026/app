"""Cross-matching logic for linking sources across catalogs.

Two phases:
1. Name-based: sources with the same normalized name in different catalogs.
2. Position-based: sources within N_SIGMA * max(pos_err_a, pos_err_b) of each other.
"""

import itertools
import re
from collections import defaultdict

from .data_catalogues.utils import angular_separation_deg, cone_pixels
from .models import CatalogSource, CrossMatch

N_SIGMA = 3.0
DEFAULT_POS_ERR_DEG = 0.1  # used when pos_err_deg is NULL


# Prefixes stripped during name normalization
_NAME_PREFIXES = re.compile(
    r"^(4fgl\s*|3fgl\s*|2fgl\s*|1fgl\s*|lhaaso\s*|1lhaaso\s*|"
    r"2hwc\s*|3hwc\s*|hawc\s*|tevcat\s*|j)",
    re.IGNORECASE,
)


def _normalize_name(name: str) -> str:
    name = name.strip().lower()
    name = re.sub(r"\s+", "", name)
    name = _NAME_PREFIXES.sub("", name)
    return name


def run_crossmatch() -> tuple[int, int]:
    """Run both crossmatch phases and return (name_matches, position_matches) counts."""
    name_count = _run_name_phase()
    pos_count = _run_position_phase()
    return name_count, pos_count


def _run_name_phase() -> int:
    sources = CatalogSource.objects.values("id", "catalog", "source_name")

    name_index: dict[str, list[int]] = defaultdict(list)
    for s in sources:
        key = _normalize_name(s["source_name"])
        name_index[key].append(s["id"])

    to_create = []
    for ids in name_index.values():
        if len(ids) < 2:
            continue
        for a_id, b_id in itertools.combinations(sorted(ids), 2):
            to_create.append(
                CrossMatch(
                    source_a_id=a_id,
                    source_b_id=b_id,
                    separation_deg=0.0,
                    method=CrossMatch.Method.NAME,
                    confidence=1.0,
                )
            )

    CrossMatch.objects.bulk_create(
        to_create,
        update_conflicts=True,
        unique_fields=["source_a", "source_b"],
        update_fields=["separation_deg", "method", "confidence"],
    )
    return len(to_create)


def _run_position_phase() -> int:
    to_create = []

    for source_a in CatalogSource.objects.iterator(chunk_size=500):
        err_a = source_a.pos_err_deg or DEFAULT_POS_ERR_DEG
        search_radius = max(err_a, DEFAULT_POS_ERR_DEG) * N_SIGMA

        pixels = cone_pixels(source_a.ra, source_a.dec, search_radius)

        candidates = (
            CatalogSource.objects.filter(healpix_id__in=pixels)
            .exclude(catalog=source_a.catalog)
            .exclude(id=source_a.id)
        )

        for source_b in candidates:
            sep = angular_separation_deg(
                source_a.ra, source_a.dec, source_b.ra, source_b.dec
            )
            err_b = source_b.pos_err_deg or DEFAULT_POS_ERR_DEG
            threshold = max(err_a, err_b) * N_SIGMA

            if sep <= threshold:
                a_id, b_id = sorted([source_a.id, source_b.id])
                confidence = max(0.0, 1.0 - sep / threshold)
                to_create.append(
                    CrossMatch(
                        source_a_id=a_id,
                        source_b_id=b_id,
                        separation_deg=sep,
                        method=CrossMatch.Method.POSITION,
                        confidence=confidence,
                    )
                )

    # Deduplicate in-memory before bulk insert (same pair may appear twice from
    # the symmetric scan)
    seen: set[tuple[int, int]] = set()
    unique = []
    for cm in to_create:
        key = (cm.source_a_id, cm.source_b_id)
        if key not in seen:
            seen.add(key)
            unique.append(cm)

    CrossMatch.objects.bulk_create(
        unique,
        update_conflicts=True,
        unique_fields=["source_a", "source_b"],
        update_fields=["separation_deg", "method", "confidence"],
    )
    return len(unique)
