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


CF4_CSV = "PGC,ra,dec,dm_cf4,e_dm,v_cmb_kms\n47404,202.4696,47.1952,29.606,0.08,732\n"


class GalaxyQueries(unittest.TestCase):
    def test_galaxy_asks_only_sdss_and_cosmicflows(self):
        import pandas as pd

        response = requests.Response()
        response.status_code = 200
        response._content = CF4_CSV.encode()
        with patch("cut_distance.fetch_sdss_spectra", return_value=pd.DataFrame()), \
                patch("requests.post", return_value=response) as post, \
                patch("catalogs.fetch_all_catalogs", side_effect=AssertionError("pełny zestaw katalogów")):
            result = cut_distance.run(202.4696, 47.1952, 0.05, "G")
        self.assertEqual(post.call_count, 1)
        self.assertEqual((result["status"], result["kind"]), ("ok", "cf4"))
        self.assertAlmostEqual(result["distance_pc"] / 1e6, 10 ** ((29.606 - 25) / 5), places=6)

    def test_cosmicflows_falls_back_to_vizier_mirror(self):
        tsv = requests.Response()
        tsv.status_code = 200
        tsv._content = ("PGC\tRAJ2000\tDEJ2000\tVcmb\tDM\te_DM\n\tdeg\tdeg\tkm/s\tmag\tmag\n"
                        "-----\t-----\t-----\t-----\t-----\t-----\n47404\t202.4696\t47.1952\t732\t29.606\t0.08\n").encode()
        with patch("requests.post", side_effect=requests.ConnectTimeout("tapvizier")), patch("requests.get", return_value=tsv) as get:
            table = cut_distance.fetch_cf4(202.4696, 47.1952, 0.15)
        self.assertEqual(get.call_count, 1)
        self.assertEqual(list(table["dm_cf4"]), [29.606])

    def test_short_mirror_reply_without_table_header_is_not_an_empty_cone(self):
        broken, empty = requests.Response(), requests.Response()
        broken.status_code = empty.status_code = 200
        broken._content = b"#INFO\tError=service unavailable\n"
        empty._content = b"#Table\tJ_ApJ_944_94_table2:\n#Name: J/ApJ/944/94/table2\n#Title: Distances of individual galaxies\n"
        with patch("requests.post", side_effect=requests.ConnectTimeout("tapvizier")), patch("requests.get", side_effect=[broken, empty]) as get:
            table = cut_distance.fetch_cf4(10.0, -80.0, 0.15)
        self.assertEqual(get.call_count, 2)
        self.assertTrue(table.empty)

    def test_failed_sdss_is_a_retryable_error(self):
        response = requests.Response()
        response.status_code = 200
        response._content = CF4_CSV.encode()
        with patch("cut_distance.fetch_sdss_spectra", side_effect=requests.ConnectionError("skyserver")), \
                patch("requests.post", return_value=response):
            result = cut_distance.run(202.4696, 47.1952, 0.05, "G")
        self.assertEqual(result["status"], "error")
        self.assertIn("sdss_spec: skyserver", result["message"])


class ServeMode(unittest.TestCase):
    def test_answers_each_job_by_id_after_ready_line(self):
        import json, subprocess, sys

        jobs = "".join(json.dumps({"id": i, "ra": 0, "dec": 0, "radius": 0.1, "type": "PN"}) + "\n" for i in (1, 2))
        done = subprocess.run([sys.executable, cut_distance.__file__, "--serve"], input=jobs, capture_output=True, text=True, timeout=600)
        lines = [json.loads(line) for line in done.stdout.splitlines()]
        self.assertEqual(lines[0], {"ready": True})
        self.assertEqual([line["id"] for line in lines[1:]], [1, 2])
        self.assertEqual(lines[1]["result"]["status"], "error")


if __name__ == "__main__":
    unittest.main()
