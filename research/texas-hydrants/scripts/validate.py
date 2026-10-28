#!/usr/bin/env python3
"""Check evidence integrity separately from statewide research acceptance.

Process owner: foundation.desired-information-can-be-found-and-recorded.capability
and foundation.research.job. This checker verifies mechanical prerequisites;
independent review must judge discovery quality and coverage assertions.
"""
from __future__ import annotations

import argparse
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path
from urllib.parse import urlparse


FAMILIES = {
    "county_gis", "municipalities", "water_utilities", "fire_authorities",
    "public_gis_catalogs", "regional_statewide",
}
RESEARCH = {"not_started", "in_progress", "blocked", "complete"}
COVERAGE = {
    "not_assessed", "verified_inventory_coverage", "partial_coverage",
    "unknown_completeness", "no_accessible_source_found",
}
DISPOSITIONS = {"usable", "restricted", "unavailable", "duplicate", "irrelevant", "unresolved"}


def _validate(root: str | Path, acceptance: bool = False) -> list[str]:
    """Return actionable errors; an empty integrity result does not mean done."""
    root = Path(root).resolve()
    errors: list[str] = []

    def fail(message):
        errors.append(message)

    def load(relative, expected=list):
        try:
            value = json.loads((root / relative).read_text())
        except (OSError, ValueError) as exc:
            fail(f"{relative}: cannot read JSON: {exc}")
            return expected()
        if not isinstance(value, expected):
            fail(f"{relative}: expected {expected.__name__}")
            return expected()
        if expected is list and any(not isinstance(row, dict) for row in value):
            fail(f"{relative}: every record must be an object")
            return [row for row in value if isinstance(row, dict)]
        return value

    def required(row, label, strings=(), lists=(), nullable=(), booleans=()):
        for key in strings:
            if not isinstance(row.get(key), str) or not row[key].strip():
                fail(f"{label}: {key} must be a nonempty string")
        for key in lists:
            if not isinstance(row.get(key), list):
                fail(f"{label}: {key} must be an array")
        for key in nullable:
            if key not in row or (row[key] is not None and not isinstance(row[key], str)):
                fail(f"{label}: {key} must be present and string or null")
        for key in booleans:
            if type(row.get(key)) is not bool:
                fail(f"{label}: {key} must be boolean")

    def values(row, key):
        value = row.get(key, [])
        return value if isinstance(value, list) else []

    def index(rows, key, label):
        result = {}
        for row in rows:
            ident = row.get(key)
            if not isinstance(ident, str) or not ident.strip():
                fail(f"{label}: missing or invalid {key}")
            elif ident in result:
                fail(f"{label}: duplicate {key} {ident}")
            else:
                result[ident] = row
        return result

    def refs(row, key, target, label, nonempty=False):
        ids = values(row, key)
        if nonempty and not ids:
            fail(f"{label}: {key} must contain evidence/record references")
        seen = set()
        for ident in ids:
            if not isinstance(ident, str) or ident not in target:
                fail(f"{label}: orphan {key} reference {ident!r}")
            elif ident in seen:
                fail(f"{label}: duplicate {key} reference {ident}")
            else:
                seen.add(ident)

    def successful_evidence(ident, kinds, expected_url=None):
        """Success is typed provenance, not an unrelated successful local check."""
        item = ei.get(ident, {}) if isinstance(ident, str) else {}
        return (item.get("outcome") == "success" and item.get("kind") in kinds
                and (expected_url is None or item.get("url") == expected_url))

    def url(value, label):
        if not isinstance(value, str) or urlparse(value).scheme not in {"http", "https"} or not urlparse(value).netloc:
            fail(f"{label}: expected absolute HTTP(S) URL")

    def timestamp(value, label):
        try:
            if not isinstance(value, str):
                raise ValueError("not a string")
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            fail(f"{label}: expected ISO date or timestamp")

    def local_path(relative, label):
        if not isinstance(relative, str):
            fail(f"{label}: invalid file path")
            return None
        path = (root / relative).resolve()
        if Path(relative).is_absolute() or not path.is_relative_to(root):
            fail(f"{label}: path must stay inside research root")
            return None
        if not path.is_file():
            fail(f"{label}: missing file {relative}")
            return None
        return path

    counties = load("data/counties.json")
    roster = load("reference/counties.json")
    tasks = load("data/discovery.json")
    searches = load("data/searches.json")
    sources = load("data/sources.json")
    leads = load("data/leads.json")
    gaps = load("data/gaps.json")
    evidence = load("evidence/index.json")
    run = load("data/run.json", dict)
    review = load("data/review.json", dict)
    ci = index(counties, "county_fips", "counties")
    ri = index(roster, "county_fips", "reference")
    ti = index(tasks, "task_id", "discovery")
    qi = index(searches, "search_id", "searches")
    si = index(sources, "source_id", "sources")
    li = index(leads, "lead_id", "leads")
    gi = index(gaps, "gap_id", "gaps")
    ei = index(evidence, "evidence_id", "evidence")

    # Texas county codes are odd values 001 through 507, always strings.
    expected_fips = {f"48{number:03d}" for number in range(1, 508, 2)}
    if len(counties) != 254 or set(ci) != expected_fips:
        fail("counties: expected exactly all 254 Texas county FIPS identifiers")
    if len(roster) != 254 or set(ri) != expected_fips:
        fail("reference: expected exactly all 254 Texas county FIPS identifiers")
    for fips, county in ci.items():
        if county.get("county_name") != ri.get(fips, {}).get("county_name"):
            fail(f"county {fips}: name differs from reference roster")
    reference_names = [row.get("county_name") for row in roster]
    if any(not isinstance(name, str) or not name.strip() for name in reference_names) or len(set(str(n) for n in reference_names)) != 254:
        fail("reference: expected 254 distinct nonempty county names")

    evidence_paths = {}
    for ident, item in ei.items():
        label = f"evidence {ident}"
        required(item, label, strings=("kind", "path", "sha256", "verified_at", "outcome"), nullable=("url",))
        if item.get("url") is not None or item.get("kind") not in {"environment_policy", "independent_review", "validation_receipt"}:
            url(item.get("url"), label)
        timestamp(item.get("verified_at"), label)
        path = local_path(item.get("path"), label)
        if path:
            evidence_paths[ident] = path
            if hashlib.sha256(path.read_bytes()).hexdigest() != item.get("sha256"):
                fail(f"{label}: SHA256 does not match saved bytes")

    # Derived roster and assessment names must agree with saved primary-source
    # bytes, not merely with one another. The stable evidence ID is part of this
    # run's reference contract; a coordinated edit of two derived files fails.
    census_id = "reference-census"
    if not successful_evidence(census_id, {"reference"}) or census_id not in evidence_paths:
        fail("reference: successful reference-census raw evidence is required")
    else:
        try:
            census = json.loads(evidence_paths[census_id].read_text())
            raw_pairs = []
            if not isinstance(census, dict) or census.get("type") != "FeatureCollection" or not isinstance(census.get("features"), list):
                fail("reference: reference-census must be Census-shaped GeoJSON")
            else:
                for feature in census["features"]:
                    properties = feature.get("properties", {}) if isinstance(feature, dict) else {}
                    if properties.get("STATEFP") == "48":
                        raw_pairs.append((properties.get("GEOID"), properties.get("NAME")))
                raw_fips = [fips for fips, name in raw_pairs]
                if (len(raw_pairs) != 254 or len(set(raw_fips)) != 254 or set(raw_fips) != expected_fips
                        or any(not isinstance(name, str) or not name.strip() for fips, name in raw_pairs)):
                    fail("reference: raw Census evidence must contain exactly 254 Texas GEOID/NAME pairs")
                raw_names = dict(raw_pairs)
                for fips in expected_fips:
                    if ri.get(fips, {}).get("county_name") != raw_names.get(fips):
                        fail(f"reference {fips}: county name differs from saved raw Census evidence")
                    if ci.get(fips, {}).get("county_name") != raw_names.get(fips):
                        fail(f"county {fips}: county name differs from saved raw Census evidence")
        except (OSError, ValueError):
            fail("reference: reference-census raw bytes are not readable JSON")

    required(review, "review", strings=("reviewer", "status", "sampling_method"), lists=(
        "audited_complete_source_ids", "audited_usable_source_ids", "audited_no_source_county_fips",
        "material_findings", "evidence_ids"))
    if review.get("status") not in {"pending", "changes_requested", "partial_audit_passed", "accepted"}:
        fail("review: invalid status")
    refs(review, "audited_complete_source_ids", si, "review")
    refs(review, "audited_usable_source_ids", si, "review")
    refs(review, "audited_no_source_county_fips", ci, "review")
    refs(review, "evidence_ids", ei, "review")
    if review.get("status") in {"partial_audit_passed", "accepted"}:
        refs(review, "evidence_ids", ei, "review", True)
        if values(review, "material_findings"):
            fail("review: passing audit cannot retain unresolved material findings")

    for ident, source in si.items():
        label = f"source {ident}"
        required(source, label, strings=("publisher", "dataset_id", "url", "access_method", "format", "crs",
            "geographic_scope", "update_information", "reuse_terms", "verified_at", "disposition", "inventory_completeness"),
            lists=("evidence_ids", "completeness_evidence_ids", "known_omissions"),
            nullable=("canonical_source_id", "claimed_coverage_boundary"))
        if "retrieval" not in source or (source["retrieval"] is not None and not isinstance(source["retrieval"], dict)):
            fail(f"{label}: retrieval must be an object or null")
        url(source.get("url"), label)
        timestamp(source.get("verified_at"), label)
        refs(source, "evidence_ids", ei, label, True)
        refs(source, "completeness_evidence_ids", ei, label)
        if source.get("disposition") not in DISPOSITIONS:
            fail(f"{label}: invalid disposition")
        if source.get("inventory_completeness") not in {"unknown", "partial", "verified"}:
            fail(f"{label}: invalid inventory_completeness")
        canonical = source.get("canonical_source_id")
        if canonical is not None and (not isinstance(canonical, str) or canonical not in si or canonical == ident):
            fail(f"{label}: invalid canonical source reference")
        if source.get("disposition") == "duplicate" and not canonical:
            fail(f"{label}: duplicate requires canonical_source_id")
        if canonical in si and si[canonical].get("disposition") == "duplicate":
            fail(f"{label}: canonical source must not itself be a duplicate")
        if source.get("inventory_completeness") == "verified":
            refs(source, "completeness_evidence_ids", ei, label, True)
            boundary = source.get("claimed_coverage_boundary")
            if not boundary:
                fail(f"{label}: verified coverage requires a claimed territory boundary")
            elif boundary in ei:
                if boundary not in evidence_paths:
                    fail(f"{label}: boundary evidence has no readable file")
            else:
                local_path(boundary, f"{label} boundary")
            if ident not in values(review, "audited_complete_source_ids") or review.get("status") not in {"partial_audit_passed", "accepted"}:
                fail(f"{label}: verified inventory requires independent audit")
        if source.get("disposition") == "usable":
            retrieval = source.get("retrieval")
            if not isinstance(retrieval, dict):
                fail(f"{label}: usable source requires demonstrated retrieval")
                continue
            required(retrieval, label + " retrieval", strings=("request_evidence_id", "response_evidence_id", "coordinate_format", "bulk_method"))
            request_id = retrieval.get("request_evidence_id")
            response_id = retrieval.get("response_evidence_id")
            for key in ("request_evidence_id", "response_evidence_id"):
                if not isinstance(retrieval.get(key), str) or retrieval[key] not in ei:
                    fail(f"{label}: missing {key}")
            if retrieval.get("coordinate_format") != "geojson":
                fail(f"{label}: verifier requires saved GeoJSON coordinate evidence")
            if not successful_evidence(request_id, {"request"}):
                fail(f"{label}: usable retrieval requires successful request evidence")
            if not successful_evidence(response_id, {"response"}):
                fail(f"{label}: usable retrieval requires successful response evidence")
            if request_id in evidence_paths:
                try:
                    request = json.loads(evidence_paths[request_id].read_text())
                    if not isinstance(request, dict) or request.get("method") not in {"GET", "POST"}:
                        fail(f"{label}: saved request must specify GET or POST")
                    else:
                        url(request.get("url"), label + " request")
                        request_url = request.get("url")
                        if ei.get(request_id, {}).get("url") != request_url:
                            fail(f"{label}: request provenance URL differs from saved replay URL")
                        if ei.get(response_id, {}).get("url") != request_url:
                            fail(f"{label}: response provenance URL differs from saved replay URL")
                        if isinstance(request_url, str) and isinstance(source.get("url"), str):
                            source_url = urlparse(source["url"])
                            replay_url = urlparse(request_url)
                            allowed_paths = {source_url.path.rstrip("/"), source_url.path.rstrip("/") + "/query"}
                            if ((source_url.scheme, source_url.netloc) != (replay_url.scheme, replay_url.netloc)
                                    or replay_url.path.rstrip("/") not in allowed_paths):
                                fail(f"{label}: replay URL is not the registered source endpoint or its query operation")
                except (OSError, ValueError):
                    fail(f"{label}: saved request must be reproducible JSON")
            location = retrieval.get("location_check")
            if not isinstance(location, dict):
                fail(f"{label}: missing location check")
                location = {}
            required(location, label + " location", strings=("method", "checked_by"), lists=("expected_bounds", "evidence_ids"))
            refs(location, "evidence_ids", ei, label + " location", True)
            bounds = location.get("expected_bounds")
            bounds_valid = isinstance(bounds, list) and len(bounds) == 4 and all(type(v) in {int, float} and math.isfinite(v) for v in bounds)
            bounds_valid = bounds_valid and -180 <= bounds[0] < bounds[2] <= 180 and -90 <= bounds[1] < bounds[3] <= 90
            if not bounds_valid:
                fail(f"{label}: expected location bounds are invalid")
            if response_id in evidence_paths:
                try:
                    response = json.loads(evidence_paths[response_id].read_text())
                    features = response.get("features") if isinstance(response, dict) else None
                    if not isinstance(response, dict) or response.get("type") != "FeatureCollection" or not isinstance(features, list) or not features or response.get("error"):
                        fail(f"{label}: response must contain nonempty GeoJSON features")
                        continue
                    if response.get("crs") and "4326" not in str(response["crs"]) and "CRS84" not in str(response["crs"]):
                        fail(f"{label}: response GeoJSON CRS must be WGS84")
                    for number, feature in enumerate(features):
                        geometry = feature.get("geometry") if isinstance(feature, dict) else None
                        point = geometry.get("coordinates") if isinstance(geometry, dict) else None
                        valid = isinstance(geometry, dict) and geometry.get("type") == "Point" and isinstance(point, list) and len(point) >= 2
                        valid = valid and all(type(v) in {int, float} and math.isfinite(v) for v in point[:2])
                        valid = valid and -180 <= point[0] <= 180 and -90 <= point[1] <= 90 and point[:2] != [0, 0]
                        if not valid:
                            fail(f"{label}: feature {number} has invalid hydrant point")
                        elif bounds_valid and not (bounds[0] <= point[0] <= bounds[2] and bounds[1] <= point[1] <= bounds[3]):
                            fail(f"{label}: feature {number} lies outside expected location")
                except (OSError, ValueError):
                    fail(f"{label}: response coordinate evidence is not JSON")

    pairs = set()
    for ident, task in ti.items():
        label = f"task {ident}"
        required(task, label, strings=("county_fips", "family", "status", "next_action"),
            lists=("query_terms", "entities", "enumeration_evidence_ids", "search_ids"), booleans=("enumeration_complete",))
        pair = (task.get("county_fips"), task.get("family"))
        if pair[0] not in ci or pair[1] not in FAMILIES:
            fail(f"{label}: invalid county/family")
        elif pair in pairs:
            fail(f"{label}: duplicate county/family")
        else:
            pairs.add(pair)
        if task.get("status") not in RESEARCH:
            fail(f"{label}: invalid research status")
        refs(task, "enumeration_evidence_ids", ei, label)
        refs(task, "search_ids", qi, label)
        if task.get("status") == "complete":
            if task.get("enumeration_complete") is not True:
                fail(f"{label}: complete task requires entity enumeration")
            refs(task, "enumeration_evidence_ids", ei, label, True)
            enumeration_ids = values(task, "enumeration_evidence_ids")
            if not enumeration_ids or any(not successful_evidence(e, {"reference", "response", "search_response"}) for e in enumeration_ids):
                fail(f"{label}: entity enumeration requires nonblocked reference or response evidence")
            refs(task, "search_ids", qi, label, True)
            if not any(qi.get(q, {}).get("outcome") in {"found", "no_result"} for q in values(task, "search_ids")):
                fail(f"{label}: complete task requires successful search evidence")
        for q in values(task, "search_ids"):
            if isinstance(q, str) and q in qi and qi[q].get("task_id") != ident:
                fail(f"{label}: search {q} belongs to another task")
    if pairs != {(fips, family) for fips in expected_fips for family in FAMILIES} or len(tasks) != 1524:
        fail("discovery: expected exactly six distinct family tasks per Texas county (1524)")

    for ident, search in qi.items():
        label = f"search {ident}"
        required(search, label, strings=("task_id", "county_fips", "query", "url", "searched_at", "outcome"), lists=("evidence_ids", "lead_ids"))
        url(search.get("url"), label)
        timestamp(search.get("searched_at"), label)
        refs(search, "evidence_ids", ei, label, True)
        refs(search, "lead_ids", li, label)
        task = ti.get(search.get("task_id"), {})
        if not task or search.get("county_fips") != task.get("county_fips"):
            fail(f"{label}: invalid task/county relationship")
        if search.get("outcome") not in {"found", "no_result", "blocked"}:
            fail(f"{label}: invalid outcome")
        if search.get("outcome") in {"found", "no_result"} and not any(
                successful_evidence(e, {"response", "search_response"}, search.get("url")) for e in values(search, "evidence_ids")):
            fail(f"{label}: nonblocked result requires successful retrieval evidence of a response matching search URL")
        if ident not in values(task, "search_ids"):
            fail(f"{label}: owning task does not link search")
        if ident not in values(ci.get(search.get("county_fips"), {}), "search_ids"):
            fail(f"{label}: owning county does not link search")

    for ident, lead in li.items():
        label = f"lead {ident}"
        required(lead, label, strings=("url", "title", "disposition", "next_action"), lists=("evidence_ids",), nullable=("county_fips", "task_id", "source_id", "blocker"))
        url(lead.get("url"), label)
        refs(lead, "evidence_ids", ei, label, True)
        if lead.get("disposition") not in DISPOSITIONS:
            fail(f"{label}: invalid disposition")
        for key, target in (("county_fips", ci), ("task_id", ti), ("source_id", si)):
            if lead.get(key) is not None and (not isinstance(lead[key], str) or lead[key] not in target):
                fail(f"{label}: orphan {key}")
        if lead.get("disposition") == "unresolved" and not lead.get("blocker"):
            fail(f"{label}: unresolved lead requires documented blocker")
        if lead.get("disposition") == "usable" and si.get(lead.get("source_id"), {}).get("disposition") != "usable":
            fail(f"{label}: usable lead requires usable source")

    for ident, gap in gi.items():
        label = f"gap {ident}"
        required(gap, label, strings=("reason", "next_action"), lists=("evidence_ids",), nullable=("county_fips",))
        if type(gap.get("priority")) is not int or gap["priority"] not in range(4):
            fail(f"{label}: priority must be integer 0..3")
        if gap.get("county_fips") is not None and gap.get("county_fips") not in ci:
            fail(f"{label}: orphan county_fips")
        refs(gap, "evidence_ids", ei, label)

    for fips, county in ci.items():
        label = f"county {fips}"
        required(county, label, strings=("county_fips", "county_name", "research_status", "coverage_status"),
            lists=("source_ids", "search_ids", "gap_ids", "evidence_ids"), nullable=("assessment_date",))
        for key, target in (("source_ids", si), ("search_ids", qi), ("gap_ids", gi), ("evidence_ids", ei)):
            refs(county, key, target, label)
        if county.get("research_status") not in RESEARCH or county.get("coverage_status") not in COVERAGE:
            fail(f"{label}: invalid status")
        for q in values(county, "search_ids"):
            if q in qi and qi[q].get("county_fips") != fips:
                fail(f"{label}: search belongs to another county")
        for g in values(county, "gap_ids"):
            if g in gi and gi[g].get("county_fips") not in {None, fips}:
                fail(f"{label}: gap belongs to another county")
        usable = [s for s in values(county, "source_ids") if si.get(s, {}).get("disposition") == "usable"]
        if county.get("research_status") == "complete":
            if not county.get("assessment_date") or not values(county, "evidence_ids"):
                fail(f"{label}: complete research requires dated assessment evidence")
            else:
                timestamp(county["assessment_date"], label)
            if any(t.get("status") != "complete" for t in tasks if t.get("county_fips") == fips):
                fail(f"{label}: complete research has unfinished discovery")
            if county.get("coverage_status") == "not_assessed":
                fail(f"{label}: complete research requires coverage assessment")
        if county.get("coverage_status") == "no_accessible_source_found":
            if county.get("research_status") != "complete" or usable:
                fail(f"{label}: no-source conclusion requires completed research and no usable linked sources")
        if county.get("coverage_status") in {"verified_inventory_coverage", "partial_coverage"} and not usable:
            fail(f"{label}: inventory coverage needs usable source evidence")
        if county.get("coverage_status") == "verified_inventory_coverage":
            if not any(si[s].get("inventory_completeness") == "verified" for s in usable):
                fail(f"{label}: verified coverage needs independently audited complete inventory")
            # A complete city/utility source does not establish completeness of
            # its containing county. Countywide assertions need their own proof.
            refs(county, "completeness_evidence_ids", ei, label, True)
            if county.get("coverage_boundary_evidence_id") not in ei:
                fail(f"{label}: county coverage requires separate territory evidence")
            if fips not in values(review, "audited_complete_county_fips"):
                fail(f"{label}: county coverage requires independent countywide audit")
        if county.get("coverage_status") != "verified_inventory_coverage" and not values(county, "gap_ids"):
            fail(f"{label}: uncertain coverage requires actionable gap")

    required(run, "run", strings=("run_id", "branch", "started_at", "status", "goal", "completion_rule"), booleans=("research_complete",))
    all_complete = len(ci) == 254 and all(c.get("research_status") == "complete" for c in counties)
    if run.get("research_complete") is True and not all_complete:
        fail("run: research_complete contradicts incomplete counties")
    if review.get("status") == "accepted" and not all_complete:
        fail("review: statewide acceptance contradicts incomplete counties")
    if acceptance or run.get("research_complete") is True:
        if not all_complete:
            fail("acceptance: all 254 county research assessments must be complete")
        if review.get("status") != "accepted":
            fail("acceptance: independent statewide review has not accepted the research")
        if values(review, "material_findings"):
            fail("acceptance: unresolved material review findings")
        usable_ids = {ident for ident, source in si.items() if source.get("disposition") == "usable"}
        if usable_ids and not usable_ids.intersection(values(review, "audited_usable_source_ids")):
            fail("acceptance: no independent usable-source sample audit")
        no_source = {fips for fips, county in ci.items() if county.get("coverage_status") == "no_accessible_source_found"}
        if no_source and not no_source.intersection(values(review, "audited_no_source_county_fips")):
            fail("acceptance: no independent no-source sample audit")
    return errors


def validate(root: str | Path, acceptance: bool = False) -> list[str]:
    """Fail closed on malformed record shapes as well as absent evidence."""
    try:
        return _validate(root, acceptance)
    except (TypeError, KeyError, AttributeError, OSError, ValueError) as exc:
        return [f"Invalid research data shape or unreadable evidence: {type(exc).__name__}: {exc}"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--acceptance", action="store_true", help="Require statewide research completion and independent acceptance")
    args = parser.parse_args()
    errors = validate(args.root, args.acceptance)
    print(json.dumps({"mode": "acceptance" if args.acceptance else "integrity", "passed": not errors, "errors": errors}, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
