#!/usr/bin/env python3
"""Run-local research state and derived views. Python standard library only."""
import argparse
import csv
import hashlib
import html
import io
import json
from pathlib import Path
import shutil
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
FAMILIES = {
    'county_gis': 'county GIS open data fire hydrants download',
    'municipalities': 'municipal cities fire hydrants GIS API',
    'water_utilities': 'water utilities districts public water systems hydrants GIS',
    'fire_authorities': 'fire marshal emergency services districts hydrant map data',
    'public_gis_catalogs': 'hydrants ArcGIS FeatureServer MapServer open data',
    'regional_statewide': 'regional council governments Texas statewide hydrant dataset',
}
KEYS = {'counties': 'county_fips', 'discovery': 'task_id', 'searches': 'search_id',
        'sources': 'source_id', 'leads': 'lead_id', 'gaps': 'gap_id', 'evidence': 'evidence_id'}


def read(path):
    return json.loads(path.read_text())


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')
    temporary.replace(path)


def initialize(root):
    """Seed unresearched county slots; never count generated queries as searches."""
    roster = read(root / 'reference/counties.json')
    counties, discovery, gaps = [], [], []
    for ref in roster:
        fips, name = ref['county_fips'], ref['county_name']
        counties.append(dict(county_fips=fips, county_name=name, research_status='blocked',
            coverage_status='not_assessed', source_ids=[], search_ids=[], gap_ids=['gap-' + fips],
            evidence_ids=['network-policy', 'network-arcgis', 'reference-census'], assessment_date=None))
        for family, terms in FAMILIES.items():
            discovery.append(dict(task_id=f'{fips}-{family}', county_fips=fips, family=family,
                status='not_started', query_terms=[f'"{name} County" Texas {terms}'], entities=[],
                enumeration_complete=False, enumeration_evidence_ids=[], search_ids=[],
                next_action=f'After public access is restored, identify relevant {family.replace("_", " ")} publishers for {name} County; execute and save the query, enumerate named entities, and follow every lead.'))
        gaps.append(dict(gap_id='gap-' + fips, county_fips=fips, priority=2,
            reason='County discovery has not been performed. Shared network restriction blocks required public-source research; no inference about hydrant existence or source availability.',
            next_action=f'Restore access; start task {fips}-county_gis using its saved query, then identify all relevant municipalities, water providers, fire authorities and regional inventories for {name} County.',
            evidence_ids=['network-policy', 'network-arcgis']))
    gaps.insert(0, dict(gap_id='gap-network', county_fips=None, priority=0,
        reason='Public ArcGIS, Census and Texas GIS requests returned proxy tunnel 403 errors.',
        next_action='Enable public web research in the managed environment network configuration, then rerun the three saved requests and start the county discovery queue. A failed request must not become a no-result search.',
        evidence_ids=['network-policy', 'network-arcgis', 'network-census', 'network-texas-gis']))
    for name, records in [('counties', counties), ('discovery', discovery), ('gaps', gaps),
                          ('sources', []), ('leads', []), ('searches', [])]:
        path = root / 'data' / (name + '.json')
        if not path.exists():
            write(path, records)


def record(root, bundle):
    """One writer merges a bounded, replayable bundle after full validation."""
    from validate import validate
    if not isinstance(bundle, dict) or not bundle or set(bundle) - set(KEYS):
        raise ValueError('Bundle must contain one or more known record collections')
    with tempfile.TemporaryDirectory(prefix='tx-hydrants-record-') as temporary:
        staged = Path(temporary) / 'inventory'
        shutil.copytree(root, staged, ignore=shutil.ignore_patterns('__pycache__', '*.tmp'))
        changed = []
        for collection, incoming in bundle.items():
            if not isinstance(incoming, list):
                raise ValueError('Each incoming collection must be a list')
            relative = Path('evidence/index.json') if collection == 'evidence' else Path('data') / (collection + '.json')
            path, key = staged / relative, KEYS[collection]
            rows = read(path)
            positions = {row[key]: i for i, row in enumerate(rows)}
            seen = set()
            for row in incoming:
                identity = row[key]
                if identity in seen:
                    raise ValueError('Duplicate record in bundle: ' + identity)
                seen.add(identity)
                if identity in positions:
                    rows[positions[identity]] = row
                else:
                    positions[identity] = len(rows)
                    rows.append(row)
            write(path, rows)
            changed.append(relative)
        errors = validate(staged)
        if errors:
            raise ValueError('\n'.join(errors))
        # Sequential single-writer publication. Interrupted multi-file publication is
        # detected by check; replay the same bundle to recover. Keep bundle in Git.
        for relative in changed:
            write(root / relative, read(staged / relative))


def csv_text(rows, fields):
    buffer = io.StringIO(newline='')
    writer = csv.DictWriter(buffer, fieldnames=fields, extrasaction='ignore', lineterminator='\n')
    writer.writeheader()
    for row in rows:
        writer.writerow({key: json.dumps(row.get(key), ensure_ascii=False) if isinstance(row.get(key), (list, dict)) else row.get(key) for key in fields})
    return buffer.getvalue()


def county_map(root, counties):
    features = read(root / 'reference/texas-counties.geojson')['features']
    by_fips = {c['county_fips']: c for c in counties}
    colors = {'not_started': '#e2e8f0', 'blocked': '#fbd38d', 'in_progress': '#90cdf4', 'complete': '#9ae6b4'}
    paths = []
    for feature in features:
        county = by_fips[str(feature['id'])]
        geometry = feature['geometry']
        polygons = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
        d = []
        for polygon in polygons:
            for ring in polygon:
                points = [((lon + 107) * 55, (37 - lat) * 65) for lon, lat, *_ in ring]
                d.append('M' + 'L'.join(f'{x:.2f},{y:.2f}' for x, y in points) + 'Z')
        label = html.escape(f"{county['county_name']} ({county['county_fips']}): research {county['research_status']}; inventory {county['coverage_status']}")
        paths.append(f'<path d="{" ".join(d)}" fill="{colors[county["research_status"]]}" fill-rule="evenodd"><title>{label}</title></path>')
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="Texas county research status; this is not hydrant coverage"><g stroke="#64748b" stroke-width="0.6">' + ''.join(paths) + '</g></svg>'


def outputs(root):
    from validate import validate
    run = read(root / 'data/run.json')
    counties = read(root / 'data/counties.json')
    sources = read(root / 'data/sources.json')
    gaps = read(root / 'data/gaps.json')
    discovery = read(root / 'data/discovery.json')
    searches = read(root / 'data/searches.json')
    done = sum(c['research_status'] == 'complete' for c in counties)
    usable = sum(s['disposition'] == 'usable' for s in sources)
    verified = sum(c['coverage_status'] == 'verified_inventory_coverage' for c in counties)
    accepted = run.get('research_complete') is True and not validate(root, acceptance=True)
    state_label = 'accepted' if accepted else 'incomplete'
    notice = ('Statewide discovery and its evidence passed the acceptance gate. Inventory gaps remain separate from research completion.' if accepted else
        'Statewide research is incomplete. ' + ('Public GIS access is blocked in this environment. ' if run.get('status') == 'blocked' else '') +
        'County rows and planned queries are preparation, not completed assessments. No accessible source found is not asserted for unsearched counties.')
    svg = county_map(root, counties)
    summary = dict(counties=len(counties), research_assessments_complete=done,
        county_research_completion_denominator=len(counties), usable_sources=usable,
        registered_sources=len(sources), verified_inventory_coverage_counties=verified,
        discovery_tasks=len(discovery), completed_discovery_tasks=sum(t['status'] == 'complete' for t in discovery),
        recorded_county_searches=len(searches), statewide_research_accepted=accepted,
        note='County counts measure research status only. No area, population, property or hydrant coverage percentage is established.')
    esc = html.escape
    rows = ''.join(f'<tr><td>{esc(c["county_name"])}</td><td>{c["county_fips"]}</td><td>{c["research_status"]}</td><td>{c["coverage_status"]}</td><td>{esc(", ".join(c["source_ids"]) or "None verified")}</td></tr>' for c in counties)
    source_rows = ''.join(f'<tr><td>{esc(s["source_id"])}</td><td>{esc(s["publisher"])}</td><td>{s["disposition"]}</td><td><a href="{esc(s["url"], quote=True)}">Endpoint lead</a></td></tr>' for s in sources)
    report = f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Texas hydrant source research — {state_label}</title>
<style>body{{font:16px/1.5 system-ui,sans-serif;color:#172033;max-width:1100px;margin:36px auto;padding:0 22px}}h1{{line-height:1.15}}.notice{{background:#fff0ce;padding:18px;border-left:5px solid #b7791f}}table{{border-collapse:collapse;width:100%;font-size:14px}}th,td{{text-align:left;padding:8px;border-bottom:1px solid #d8dee8}}svg{{max-width:650px;width:100%}}a{{color:#154e8a}}.metrics{{font-size:22px;font-weight:600}}code{{background:#eef2f7;padding:2px 4px}}</style>
<h1>Texas hydrant source inventory</h1><p>Research run: tx-hydrants-20261028 · Reference date: October 28, 2026</p>
<div class="notice">{html.escape(notice)}</div>
<p class="metrics">{done} / {len(counties)} county assessments complete · {usable} usable sources · {verified} counties with verified inventory coverage</p>
<p>Research completion and hydrant inventory coverage are separate. The denominator above is the 254 Texas counties in the saved Census reference. No percentage of hydrants, land, properties or population covered has been established.</p>
<p><a href="../contract.html">Goal, discovery method and acceptance rules</a> · <a href="county-assessments.csv">County table</a> · <a href="source-registry.csv">Source registry</a> · <a href="acquisition-backlog.csv">Acquisition backlog</a> · <a href="../HANDOFF.txt">Resume instructions</a></p>
<h2>County research status</h2><p>Orange: blocked. Gray: not started. Blue: in progress. Green: research complete. Color never means complete hydrant coverage. Hover a county for both statuses.</p>{svg}
<p>Display-only boundaries: Census CitySDK, 2022, 1:20,000,000. <a href="../reference/provenance.json">Provenance and limitations</a>. County boundaries and point extents do not establish inventory completeness. This map displays research status only. An inventory territory overlay requires separately verified service boundaries and completeness evidence.</p>
<h2>Registered source leads</h2><table><thead><tr><th>ID</th><th>Publisher attribution</th><th>Disposition</th><th>Location</th></tr></thead><tbody>{source_rows or '<tr><td colspan="4">No dataset source verified.</td></tr>'}</tbody></table>
<h2>All county assessment slots</h2><table><thead><tr><th>County</th><th>FIPS</th><th>Research</th><th>Inventory coverage</th><th>Linked sources</th></tr></thead><tbody>{rows}</tbody></table>
<p>Distance calculations must report the nearest observed hydrant unless inventory completeness, private-system omissions and neighboring jurisdictions have been resolved. Coordinate availability alone does not prove operational serviceability.</p></html>'''
    return {'summary.json': json.dumps(summary, indent=2) + '\n', 'index.html': report,
        'county-research-status.svg': svg,
        'county-assessments.csv': csv_text(counties, ['county_name','county_fips','research_status','coverage_status','source_ids','search_ids','gap_ids','evidence_ids','assessment_date']),
        'source-registry.csv': csv_text(sources, ['source_id','publisher','dataset_id','url','access_method','format','crs','geographic_scope','update_information','reuse_terms','verified_at','disposition','canonical_source_id','inventory_completeness','evidence_ids']),
        'acquisition-backlog.csv': csv_text(sorted(gaps, key=lambda g: (g['priority'],g['gap_id'])), ['gap_id','county_fips','priority','reason','next_action','evidence_ids']),
        'discovery-plan.csv': csv_text(discovery, ['task_id','county_fips','family','status','query_terms','entities','enumeration_complete','search_ids','next_action'])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('init')
    next_parser = sub.add_parser('next'); next_parser.add_argument('--county')
    record_parser = sub.add_parser('record'); record_parser.add_argument('bundle', type=Path)
    sub.add_parser('report')
    sub.add_parser('check-reports')
    args = parser.parse_args()
    root = args.root.resolve()
    if args.command == 'init':
        initialize(root)
    elif args.command == 'record':
        record(root, read(args.bundle))
    elif args.command == 'next':
        task = next((t for t in read(root / 'data/discovery.json') if t['status'] != 'complete' and (not args.county or t['county_fips'] == args.county)), None)
        print(json.dumps({'run_status':read(root/'data/run.json')['status'], 'task':task, 'warning':'Selecting a query does not execute it. Save actual search evidence before changing status.'}, indent=2))
    else:
        errors = []
        for filename, content in outputs(root).items():
            path = root / 'reports' / filename
            if args.command == 'report':
                path.parent.mkdir(parents=True, exist_ok=True); path.write_text(content)
            elif not path.exists() or path.read_text() != content:
                errors.append('Stale or absent derived report: ' + filename)
        if errors:
            print('\n'.join(errors), file=sys.stderr); return 1
        print('Reports generated.' if args.command == 'report' else 'Derived report readback passed.')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, KeyError, OSError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
