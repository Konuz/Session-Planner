import unittest
from unittest.mock import patch

import requests

import cut_distance


class StellarQueries(unittest.TestCase):
    def test_keeps_source_ids_and_switches_provider_on_rate_limit(self):
        source_id = 2207203626363177088
        base = "source_id,ra,dec,parallax,parallax_error,pmra,pmdec,phot_g_mean_mag,astrometric_params_solved,pseudocolour,r_med_photogeo\n"
        calibrators = "source_id,ecl_lat,nu_eff_used_in_astrometry\n"
        calls = []

        def post(url, *, data, timeout):
            calls.append(url)
            response = requests.Response()
            response.status_code = 200
            if "dc.zah" in url:
                response._content = (base + f"{source_id},343,62,1.2,0.02,1,2,14,31,,810\n").encode()
            elif "gaia.ari" in url:
                response.status_code = 429
                response.headers["Retry-After"] = "30"
            else:
                self.assertIn(str(source_id), data["QUERY"])
                response._content = (calibrators + f"{source_id},60,1.4\n").encode()
            return response

        with patch("requests.post", side_effect=post):
            data = cut_distance.fetch_stellar_cone(343.2374, 62.1828, 0.15)

        self.assertEqual(len(calls), 3)
        self.assertEqual(int(data.iloc[0]["source_id"]), source_id)
        self.assertTrue(data.iloc[0]["zp_applied"])

    def test_empty_stellar_cone_becomes_abstention_without_auxiliary_catalogs(self):
        response = requests.Response()
        response.status_code = 200
        response._content = (",".join((*cut_distance.STELLAR_COLUMNS, "r_med_photogeo")) + "\n").encode()
        with patch("requests.post", return_value=response) as post:
            result = cut_distance.run(343.2374, 62.1828, 0.0335, "EN")
        self.assertEqual(post.call_count, 1)
        self.assertEqual(result["status"], "abstain")
        self.assertEqual(result["reason"], "EMPTY_SIGHTLINE")

    def test_unavailable_gavo_falls_back_to_full_astrometry(self):
        source_id = 2207203626363177088
        base = (*cut_distance.STELLAR_COLUMNS, "ecl_lat", "nu_eff_used_in_astrometry")
        busy = requests.Response()
        busy.status_code = 503
        full = requests.Response()
        full.status_code = 200
        full._content = (",".join(base) + f"\n{source_id},343,62,1.2,0.02,1,2,14,31,,60,1.4\n").encode()
        distances = requests.Response()
        distances.status_code = 200
        distances._content = f"source_id,r_med_photogeo\n{source_id},810\n".encode()
        with patch("requests.post", side_effect=[busy, full, distances]) as post:
            data = cut_distance.fetch_stellar_cone(343.2374, 62.1828, 0.15)
        self.assertIn("FROM gaiaedr3_complements.distances", post.call_args.kwargs["data"]["QUERY"])
        self.assertTrue(data.iloc[0]["zp_applied"])


if __name__ == "__main__":
    unittest.main()
