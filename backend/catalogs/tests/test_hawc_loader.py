import math

from catalogs.loaders import HAWCLoader


class _TestableHAWCLoader(HAWCLoader):
    def normalize_for_test(self, data):
        return super()._normalize(data)


def test_hawc_normalize_keeps_only_flux_uncertainty_and_index():
    loader = _TestableHAWCLoader()

    data = [
        {
            "name": "3HWC J0534+220",
            "RA": 83.6279,
            "Dec": 22.0243,
            "position uncertainty": 0.05725810686362343,
            "search radius": 0.0,
            "TS": 35736.499681,
            "flux measurements": [
                {
                    "assumed radius": 0.0,
                    "flux": 2.34204e-13,
                    "flux statistical uncertainty up": 1.40459e-15,
                    "flux statistical uncertainty down": -1.40228e-15,
                    "index": -2.57949,
                    "index statistical uncertainty up": 0.00465904,
                    "index statistical uncertainty down": -0.00465478,
                }
            ],
        }
    ]

    sources = loader.normalize_for_test(data)

    assert len(sources) == 1
    md = sources[0]["metadata"]

    assert md["flux1000"] == 2.34204e-13
    assert md["flux1000_err"] == 1.40459e-15

    assert md["spectral_index"] == -2.57949
    assert md["spectral_index_err"] == 0.00465904

    # TS is promoted to a derived significance for UI filters
    assert math.isclose(md["significance"], math.sqrt(35736.499681))
