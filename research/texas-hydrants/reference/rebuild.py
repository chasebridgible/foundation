#!/usr/bin/env python3
"""Rebuild the county roster and display boundaries from saved response bytes.

Owner: foundation.desired-information-can-be-found-and-recorded.capability /
foundation.research.job. This is a project reference transform, not discovery.
Run from any directory: python reference/rebuild.py
"""
import csv
import hashlib
import io
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / 'reference'
EVIDENCE = ROOT / 'evidence' / 'reference'
SOURCE = EVIDENCE / 'census-counties-2022-20m.geojson'


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def positions(coords):
    if len(coords) >= 2 and isinstance(coords[0], (int, float)):
        yield coords
    else:
        for part in coords:
            yield from positions(part)


def rebuild():
    requests = json.loads((EVIDENCE / 'census-requests.json').read_text())
    source_record = requests['requests'][0]
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == source_record['sha256'], 'Saved response hash mismatch'
    source = json.loads(SOURCE.read_text())
    selected = sorted((f for f in source['features'] if f['properties']['STATEFP'] == '48'), key=lambda f: f['properties']['GEOID'])
    assert len(selected) == 254
    expected = {f'48{number:03d}' for number in range(1, 508, 2)}
    assert {f['properties']['GEOID'] for f in selected} == expected
    roster = []
    boundary_features = []
    coords = []
    for f in selected:
        p = f['properties']
        assert p['GEOID'] == p['STATEFP'] + p['COUNTYFP']
        assert p['NAME'] and p['STATE_NAME'] == 'Texas'
        assert f['geometry']['type'] in {'Polygon', 'MultiPolygon'}
        for xy in positions(f['geometry']['coordinates']):
            assert all(math.isfinite(c) for c in xy)
            assert -107 <= xy[0] <= -93 and 25 <= xy[1] <= 37, 'Unexpected Texas coordinate'
            coords.append(xy)
        roster.append({'county_name': p['NAME'], 'county_fips': p['GEOID'], 'state_fips': p['STATEFP'], 'reference_evidence': 'evidence/reference/census-counties-2022-20m.geojson'})
        boundary_features.append({'type': 'Feature', 'id': p['GEOID'], 'properties': {'county_name': p['NAME'], 'county_fips': p['GEOID'], 'boundary_vintage': 2022, 'boundary_scale': '1:20,000,000', 'boundary_purpose': 'county assessment display only; not inventory or service-area coverage'}, 'geometry': f['geometry']})
    write_json(REF / 'counties.json', roster)
    buf = io.StringIO(newline='')
    writer = csv.DictWriter(buf, fieldnames=list(roster[0]), lineterminator='\n')
    writer.writeheader()
    writer.writerows(roster)
    (REF / 'counties.csv').write_text(buf.getvalue())
    write_json(REF / 'texas-counties.geojson', {'type': 'FeatureCollection', 'features': boundary_features})
    old = json.loads((EVIDENCE / 'plotly-counties.geojson').read_text())
    mirror = {f['id']: f['properties']['NAME'] for f in old['features'] if f['properties']['STATE'] == '48'}
    official = {x['county_fips']: x['county_name'] for x in roster}
    assert mirror == official, 'Mirror roster differs; investigate before changing county universe'
    write_json(REF / 'validation.json', {
        'county_count': len(roster), 'unique_fips_count': len(official),
        'expected_fips_set': '48001 through 48507, odd county codes only',
        'expected_fips_set_matches': True, 'mirror_names_and_fips_match': True,
        'boundary_geometry_types': sorted({f['geometry']['type'] for f in selected}),
        'observed_boundary_bbox_lon_lat': [min(p[0] for p in coords), min(p[1] for p in coords), max(p[0] for p in coords), max(p[1] for p in coords)],
        'coordinate_count': len(coords), 'all_coordinates_finite_and_in_broad_texas_bounds': True,
        'boundary_validity_limit': 'Structural/range validation only; no topology or survey validation. Never establishes hydrant completeness.',
        'source_sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'derived_files': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in [REF / 'counties.json', REF / 'counties.csv', REF / 'texas-counties.geojson']}
    })
    print('254 county names/FIPS and display boundaries rebuilt; source hash and mirror roster match.')

if __name__ == '__main__':
    rebuild()
