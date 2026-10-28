#!/usr/bin/env python3
"""Regression probes for false completion and unsupported hydrant evidence.

The fixture is synthetic and deliberately not production research. Its roster
uses the known Texas FIPS range; real roster names are separately cross-checked
against the saved Census reference by validate.py.
"""
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from validate import FAMILIES, validate


class EvidenceGateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.rows = {}
        roster = [{"county_fips": f"48{i:03}", "county_name": f"Synthetic {i}"} for i in range(1, 508, 2)]
        self.rows["reference/counties.json"] = roster
        self.rows["data/counties.json"] = [dict(r, research_status="blocked", coverage_status="not_assessed", source_ids=[], search_ids=[],
            gap_ids=["gap-" + r["county_fips"]], evidence_ids=[], assessment_date=None) for r in roster]
        self.rows["data/discovery.json"] = [dict(task_id=r["county_fips"] + "-" + f, county_fips=r["county_fips"], family=f,
            status="not_started", query_terms=[r["county_name"] + " hydrants"], entities=[], enumeration_complete=False,
            enumeration_evidence_ids=[], search_ids=[], next_action="Identify and inspect county publisher") for r in roster for f in sorted(FAMILIES)]
        self.rows["data/gaps.json"] = [dict(gap_id="gap-" + r["county_fips"], county_fips=r["county_fips"], priority=2,
            reason="Research blocked", next_action="Restore access and investigate named county", evidence_ids=[]) for r in roster]
        for name in ("searches", "sources", "leads"):
            self.rows[f"data/{name}.json"] = []
        self.rows["evidence/index.json"] = []
        self.rows["data/run.json"] = dict(run_id="synthetic", branch="test", started_at="2026-10-28T00:00:00Z", status="blocked",
            goal="Synthetic acceptance gate exercise", completion_rule="All county assessments independently accepted", research_complete=False)
        self.rows["data/review.json"] = dict(reviewer="independent test reviewer", status="pending", audited_complete_source_ids=[],
            audited_usable_source_ids=[], audited_no_source_county_fips=[], sampling_method="Pending evidence", material_findings=[], evidence_ids=[])
        self.evidence("reference-census", {"type": "FeatureCollection", "features": [
            {"type": "Feature", "properties": {"STATEFP": "48", "GEOID": row["county_fips"], "NAME": row["county_name"]},
                "geometry": None} for row in roster]}, kind="reference")
        self.save()

    def save(self):
        for filename, data in self.rows.items():
            path = self.root / filename
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(data))

    def evidence(self, ident, body, outcome="success", kind="response", url="https://example.invalid/synthetic"):
        relative = f"evidence/{ident}.json"
        path = self.root / relative
        path.parent.mkdir(exist_ok=True)
        path.write_text(json.dumps(body))
        self.rows["evidence/index.json"].append(dict(evidence_id=ident, kind=kind, path=relative,
            sha256=hashlib.sha256(path.read_bytes()).hexdigest(), url=url,
            verified_at="2026-10-28T00:00:00Z", outcome=outcome))
        return ident

    def evidence_row(self, ident):
        return next(row for row in self.rows["evidence/index.json"] if row["evidence_id"] == ident)

    def usable(self):
        self.evidence("request", {"method": "GET", "url": "https://example.invalid/hydrants"}, kind="request", url="https://example.invalid/hydrants")
        self.evidence("points", {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"id": "test-1"},
            "geometry": {"type": "Point", "coordinates": [-97.74, 30.27]}}]}, url="https://example.invalid/hydrants")
        self.evidence("location", {"expected": "Synthetic Austin bounding region"}, kind="assessment")
        source = dict(source_id="sample", publisher="Synthetic publisher", dataset_id="sample-points", url="https://example.invalid/hydrants",
            access_method="GET", format="GeoJSON", crs="EPSG:4326", geographic_scope="Synthetic Austin sample",
            update_information="Unknown", reuse_terms="Unknown", verified_at="2026-10-28T00:00:00Z", disposition="usable",
            canonical_source_id=None, evidence_ids=["request", "points", "location"], inventory_completeness="unknown",
            completeness_evidence_ids=[], claimed_coverage_boundary=None, known_omissions=["Completeness unknown"],
            retrieval={"request_evidence_id": "request", "response_evidence_id": "points", "coordinate_format": "geojson",
                "location_check": {"expected_bounds": [-98, 30, -97, 31], "method": "Expected-region check", "checked_by": "Independent checker",
                    "evidence_ids": ["location"]}, "bulk_method": "Retrieve stable IDs and verify every returned page"})
        self.rows["data/sources.json"].append(source)
        self.rows["data/counties.json"][0]["source_ids"] = ["sample"]
        return source

    def assert_rejected(self, text, acceptance=False):
        self.save()
        errors = validate(self.root, acceptance)
        self.assertTrue(errors, "Invalid research passed")
        self.assertTrue(any(text in e for e in errors), errors)

    def test_truthful_blocked_state_passes_integrity_but_not_acceptance(self):
        self.assertEqual(validate(self.root), [])
        self.assert_rejected("all 254", acceptance=True)

    def test_missing_county_cannot_hide_behind_present_reference(self):
        self.rows["data/counties.json"].pop()
        self.assert_rejected("254 Texas county")

    def test_duplicate_fips_cannot_preserve_count(self):
        self.rows["data/counties.json"][-1] = copy.deepcopy(self.rows["data/counties.json"][0])
        self.assert_rejected("duplicate county_fips")

    def test_wrong_name_is_not_accepted_as_correct_fips(self):
        self.rows["data/counties.json"][0]["county_name"] = "Wrong county"
        self.assert_rejected("name differs")

    def test_orphan_source_and_evidence_references_rejected(self):
        self.rows["data/counties.json"][0].update(source_ids=["missing-source"], evidence_ids=["missing-evidence"])
        self.assert_rejected("orphan source_ids")
        self.assert_rejected("orphan evidence_ids")

    def test_usable_requires_actual_coordinates(self):
        self.usable()["retrieval"] = None
        self.assert_rejected("demonstrated retrieval")

    def test_valid_coordinate_sample_still_does_not_mean_complete(self):
        self.usable()
        self.save()
        self.assertEqual(validate(self.root), [])
        self.assert_rejected("all 254", acceptance=True)

    def test_changed_evidence_bytes_detected(self):
        self.usable()
        (self.root / "evidence/points.json").write_text("{}")
        self.assert_rejected("SHA256")

    def test_html_and_arcgis_error_are_not_coordinate_evidence(self):
        self.usable()
        for body in ("<html>Sign in</html>", {"error": {"code": 499, "message": "Token required"}}, {"type": "FeatureCollection", "features": []}):
            with self.subTest(body=body):
                path = self.root / "evidence/points.json"
                path.write_text(json.dumps(body))
                self.evidence_row("points")["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
                self.assert_rejected("nonempty GeoJSON")

    def test_invalid_or_mislocated_coordinates_rejected(self):
        self.usable()
        for coordinates, message in (([0, 0], "invalid hydrant point"), ([30.27, -97.74], "invalid hydrant point"),
            ([-120, 45], "outside expected"), ([float("nan"), 30], "invalid hydrant point")):
            with self.subTest(coordinates=coordinates):
                path = self.root / "evidence/points.json"
                response = json.loads(path.read_text())
                response["features"][0]["geometry"]["coordinates"] = coordinates
                path.write_text(json.dumps(response))
                self.evidence_row("points")["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
                self.assert_rejected(message)

    def test_county_complete_with_unfinished_searches_rejected(self):
        self.rows["data/counties.json"][0].update(research_status="complete", coverage_status="unknown_completeness")
        self.assert_rejected("unfinished discovery")

    def test_completed_family_requires_real_enumeration_and_success(self):
        self.rows["data/discovery.json"][0]["status"] = "complete"
        self.assert_rejected("entity enumeration")
        self.assert_rejected("successful search evidence")

    def test_no_source_is_not_a_synonym_for_network_block(self):
        self.rows["data/counties.json"][0]["coverage_status"] = "no_accessible_source_found"
        self.assert_rejected("no-source conclusion")

    def test_duplicate_source_requires_canonical_inventory(self):
        source = self.usable()
        source.update(disposition="duplicate", canonical_source_id=None)
        self.assert_rejected("duplicate requires canonical_source_id")

    def test_full_coverage_claim_needs_territory_statement_and_audit(self):
        self.usable()["inventory_completeness"] = "verified"
        self.assert_rejected("claimed territory boundary")
        self.assert_rejected("independent audit")

    def test_complete_city_does_not_establish_county_coverage(self):
        self.usable()
        self.rows["data/counties.json"][0]["coverage_status"] = "verified_inventory_coverage"
        self.assert_rejected("separate territory evidence")
        self.assert_rejected("countywide audit")

    def test_path_escape_is_rejected(self):
        self.evidence("e", {"body": "test"})
        self.evidence_row("e")["path"] = "../outside.json"
        self.assert_rejected("stay inside research root")

    def test_missing_file_and_malformed_record_fail_closed(self):
        (self.root / "data/sources.json").unlink()
        self.assertTrue(validate(self.root))
        self.rows["data/counties.json"][0]["county_fips"] = ["48001"]
        self.save()
        self.assertTrue(validate(self.root))

    def test_run_and_review_cannot_self_declare_completion(self):
        self.rows["data/run.json"]["research_complete"] = True
        self.rows["data/review.json"]["status"] = "accepted"
        self.assert_rejected("contradicts incomplete counties")

    def test_local_review_evidence_does_not_require_fabricated_web_url(self):
        self.evidence("local", {"review": "Synthetic local review"}, kind="independent_review")
        self.rows["evidence/index.json"][-1]["url"] = None
        self.save()
        self.assertEqual(validate(self.root), [])
        self.rows["evidence/index.json"][-1]["kind"] = "response"
        self.assert_rejected("HTTP(S) URL")

    def test_blocked_response_cannot_back_a_no_result_search(self):
        self.evidence("denied", {"error": "Tunnel connection failed: 403 Forbidden"}, outcome="blocked")
        task = self.rows["data/discovery.json"][0]
        task.update(status="complete", enumeration_complete=True, enumeration_evidence_ids=["denied"], search_ids=["q1"])
        self.rows["data/counties.json"][0]["search_ids"] = ["q1"]
        self.rows["data/searches.json"].append(dict(search_id="q1", task_id=task["task_id"], county_fips=task["county_fips"],
            query="Synthetic county hydrants", url="https://example.invalid/search", searched_at="2026-10-28", outcome="no_result",
            evidence_ids=["denied"], lead_ids=[]))
        self.assert_rejected("requires successful retrieval evidence")

    def test_acceptance_is_reachable_only_after_all_structural_gates(self):
        # This large, fully synthetic case exercises the positive gate without
        # accidentally treating this session's real blocked work as accepted.
        self.evidence("searched", {"synthetic": "all scoped searches have no result"}, url="https://example.invalid/search")
        self.evidence("audit", {"synthetic": "independent audit of sampling and discovery"}, kind="independent_review")
        self.rows["evidence/index.json"][-1]["url"] = None
        ci = {c["county_fips"]: c for c in self.rows["data/counties.json"]}
        for task in self.rows["data/discovery.json"]:
            search_id = "q-" + task["task_id"]
            task.update(status="complete", enumeration_complete=True, enumeration_evidence_ids=["searched"], search_ids=[search_id])
            self.rows["data/searches.json"].append(dict(search_id=search_id, task_id=task["task_id"], county_fips=task["county_fips"],
                query="Synthetic scoped search", url="https://example.invalid/search", searched_at="2026-10-28", outcome="no_result",
                evidence_ids=["searched"], lead_ids=[]))
            ci[task["county_fips"]]["search_ids"].append(search_id)
        for county in ci.values():
            county.update(research_status="complete", coverage_status="no_accessible_source_found", evidence_ids=["searched"], assessment_date="2026-10-28")
        self.rows["data/review.json"].update(status="accepted", evidence_ids=["audit"], audited_no_source_county_fips=["48001"],
            sampling_method="Synthetic sample for positive gate regression only")
        self.rows["data/run.json"]["research_complete"] = True
        self.save()
        self.assertEqual(validate(self.root, acceptance=True), [])

    def test_coordinated_derived_roster_edit_cannot_change_raw_census_truth(self):
        self.rows["reference/counties.json"][0]["county_name"] = "Invented County"
        self.rows["data/counties.json"][0]["county_name"] = "Invented County"
        self.assert_rejected("differs from saved raw Census evidence")

    def test_local_policy_success_cannot_launder_blocked_search_as_complete(self):
        self.evidence("network-policy", {"network": "restricted"}, kind="environment_policy", url=None)
        self.evidence("network-arcgis", {"error": "Tunnel connection failed: 403 Forbidden"}, outcome="blocked", kind="request",
            url="https://example.invalid/search")
        task = self.rows["data/discovery.json"][0]
        proof = ["network-policy", "network-arcgis"]
        task.update(status="complete", enumeration_complete=True, enumeration_evidence_ids=proof, search_ids=["blocked-search"])
        self.rows["data/counties.json"][0]["search_ids"] = ["blocked-search"]
        self.rows["data/searches.json"].append(dict(search_id="blocked-search", task_id=task["task_id"], county_fips=task["county_fips"],
            query="Synthetic county hydrants", url="https://example.invalid/search", searched_at="2026-10-28", outcome="no_result",
            evidence_ids=proof, lead_ids=[]))
        self.assert_rejected("response matching search URL")
        self.assert_rejected("enumeration requires nonblocked")

    def test_unrelated_successful_response_does_not_prove_a_search(self):
        self.evidence("unrelated", {"synthetic": "Other successful response"}, url="https://example.invalid/other")
        task = self.rows["data/discovery.json"][0]
        task["search_ids"] = ["q1"]
        self.rows["data/counties.json"][0]["search_ids"] = ["q1"]
        self.rows["data/searches.json"].append(dict(search_id="q1", task_id=task["task_id"], county_fips=task["county_fips"],
            query="Synthetic county hydrants", url="https://example.invalid/search", searched_at="2026-10-28", outcome="no_result",
            evidence_ids=["unrelated"], lead_ids=[]))
        self.assert_rejected("response matching search URL")

    def test_usable_requires_successful_request_and_bound_response_provenance(self):
        self.usable()
        self.evidence_row("request")["outcome"] = "blocked"
        self.assert_rejected("successful request evidence")
        self.evidence_row("request")["outcome"] = "success"
        self.evidence_row("points")["url"] = "https://example.invalid/other"
        self.assert_rejected("response provenance URL differs")


if __name__ == "__main__":
    unittest.main()
