#!/usr/bin/env python3
"""Batteribytte · find sound-effect candidates for every sound in docs/sound-brief.md.

Sources (each read from its own API documentation first):
  - Openverse  https://api.openverse.org/v1/  (anonymous: 20 requests/min, 200/day; the script waits between calls)
      GET /v1/audio/?q=…&license=cc0,by&page_size=20  → results[].{id,title,creator,license,license_version,
      attribution,duration (ms),tags,url,foreign_landing_url,source,provider,filetype}
  - Freesound  https://freesound.org/docs/api/  (token; not wired in yet: the host was refused from this machine)
  - ElevenLabs is generated, not searched: see tools/sfx/elevenlabs.py.

Only CC0 and CC BY are kept (never NC, Sampling+, PDM-with-unknown, or anything else). Results are merged into
tools/sfx/candidates.json, keyed by sound id; entries from other sources already in the file are kept.

  python3 tools/sfx/search.py              # all sounds
  python3 tools/sfx/search.py pop fizz     # just these
"""
import json, sys, time, urllib.parse, urllib.request, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'tools/sfx/candidates.json'
PER_SOURCE = 10                     # keep up to this many per sound per source
OV_GAP = 3.2                        # seconds between Openverse calls (20/min)

# id, kind (E = one-shot, L = loop), wanted length in seconds (lo, hi), queries (the first two are used for Openverse)
SOUNDS = [
    ('pop',       'E', (0.3, 1.0),  ['soda can open', 'can opening pop tab', 'beer can crack open']),
    ('fizz',      'L', (2, 4),      ['soda fizz', 'carbonation bubbles', 'fizzy drink bubbles']),
    ('spray',     'E', (0.5, 2),    ['soda spray burst', 'champagne spray foam', 'fizz burst', 'spray', 'foam']),
    ('charge',    'L', (2, 6),      ['electric charge up', 'power up hum loop', 'electricity buzz loop']),
    ('full',      'E', (0.4, 1.5),  ['power up complete', 'electric zap ding', 'level up zap']),
    ('powerDown', 'E', (0.3, 1.0),  ['power down', 'electricity power off', 'machine power down']),
    ('hum',       'L', (3, 10),     ['vending machine hum', 'fluorescent light buzz', 'refrigerator hum']),
    ('crush',     'E', (0.5, 1.5),  ['aluminum can crush', 'crushing soda can', 'can crusher']),
    ('reject',    'E', (0.3, 1.0),  ['error buzzer', 'wrong buzzer', 'access denied buzz']),
    ('accept',    'E', (0.2, 0.8),  ['success beep', 'confirmation chime', 'correct answer ding']),
    ('scanBeep',  'E', (0.05, 0.2), ['barcode scanner beep', 'supermarket scanner beep', 'checkout beep', 'scanner beep', 'beep short']),
    ('suck',      'E', (0.5, 1.0),  ['vacuum suction', 'pneumatic suck', 'air suction whoosh', 'suction', 'vacuum']),
    ('gulp',      'E', (0.3, 0.8),  ['can drop into machine', 'hollow metal thud', 'vending machine drop']),
    ('rollers',   'L', (1, 4),      ['small electric motor loop', 'conveyor rollers', 'motor whir']),
    ('lock',      'E', (0.1, 0.4),  ['magnetic snap', 'latch click', 'mechanical lock click']),
    ('click',     'E', (0.05, 0.3), ['arcade button press', 'big button click', 'push button click', 'button click', 'button press']),
    ('printer',   'E', (1, 2),      ['receipt printer', 'thermal printer', 'pos printer']),
    ('rumble',    'L', (2, 5),      ['machine malfunction', 'motor struggling', 'jammed machine']),
    ('rattle',    'E', (0.2, 0.6),  ['metal rattle', 'shaking metal box', 'cabinet rattle', 'rattle', 'shake metal']),
    ('clank',     'E', (0.1, 0.5),  ['can hit metal', 'metal clank', 'tin can hit']),
    ('thud',      'E', (0.2, 0.6),  ['can drop thud', 'heavy thud', 'can land']),
    ('drop',      'E', (0.1, 0.4),  ['empty can drop', 'aluminium can bounce', 'can fall floor']),
    ('whoosh',    'E', (0.4, 1.0),  ['whoosh', 'soft swoosh', 'air swish']),
    ('tick',      'E', (0.05, 0.2), ['ui tick', 'relay click', 'meter tick']),
    ('grab',      'E', (0.05, 0.2), ['pick up can', 'grab object', 'hand grab']),
    ('ui',        'E', (0.03, 0.15), ['ui click soft', 'button tap', 'soft click']),
    ('room',      'L', (10, 30),    ['night city ambience', 'parking lot night ambience', 'distant traffic night']),
]

def lic_info(code, version=''):
    """Only these two ever pass."""
    code = (code or '').lower()
    if code == 'cc0':
        return dict(license='CC0 1.0', commercial_ok=True, attribution_required=False, license_rank=0)
    if code == 'by':
        return dict(license=f'CC BY {version}'.strip(), commercial_ok=True, attribution_required=True, license_rank=1)
    return None

def get_json(url, headers=None):
    req = urllib.request.Request(url, headers={'User-Agent': 'sfx-search/1.0', **(headers or {})})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r), dict(r.headers)

def openverse(sound):
    sid, kind, (lo, hi), queries = sound
    lo_ms, hi_ms = 200, (max(30000, hi * 4000) if kind == 'L' else 6000)   # 0.2–6 s; loops longer (trimmed later)
    seen, out = set(), []
    for qi, q in enumerate(queries):
        if qi >= 2 and len(out) >= 5:                          # the third phrase only when the first two found little
            break
        url = 'https://api.openverse.org/v1/audio/?' + urllib.parse.urlencode({'q': q, 'license': 'cc0,by', 'page_size': 20})
        d = None
        for attempt in range(2):                               # the API answers 500 now and then: one retry
            try:
                d, h = get_json(url); break
            except Exception as e:
                print(f'  openverse {sid} "{q}": {e}', file=sys.stderr); time.sleep(OV_GAP * 2)
        if d is None:
            continue
        left = h.get('x-ratelimit-available-anon_sustained')
        for r in d.get('results', []):
            li = lic_info(r.get('license'), r.get('license_version'))
            dur = r.get('duration')
            if not li or not r.get('url') or r['id'] in seen or dur is None or not (lo_ms <= dur <= hi_ms):
                continue
            seen.add(r['id'])
            out.append(dict(
                source='openverse', id=r['id'], provider=r.get('provider'), via_source=r.get('source'),
                title=r.get('title'), creator=r.get('creator'), creator_url=r.get('creator_url'),
                **li, attribution=r.get('attribution'),
                duration=round(dur / 1000, 3), tags=[t.get('name') for t in (r.get('tags') or [])][:15],
                downloads=None, rating=None,                   # Openverse does not carry these
                source_url=r.get('foreign_landing_url'), preview_url=r.get('url'), filetype=r.get('filetype'),
                query=q,
            ))
        print(f'  openverse {sid:9s} "{q}": {len(d.get("results", []))} results, kept {len(out)} so far (left today: {left})')
        time.sleep(OV_GAP)
    # CC0 first, then nearest to the wanted length
    mid = (lo + hi) / 2
    out.sort(key=lambda c: (c['license_rank'], abs(c['duration'] - mid)))
    return out[:PER_SOURCE]

def main():
    want = set(sys.argv[1:])
    data = json.loads(OUT.read_text()) if OUT.exists() else {}
    for s in SOUNDS:
        if want and s[0] not in want:
            continue
        entry = data.setdefault(s[0], {'kind': s[1], 'length': list(s[2]), 'queries': s[3], 'candidates': []})
        entry.update(kind=s[1], length=list(s[2]), queries=s[3])
        keep = [c for c in entry['candidates'] if c['source'] != 'openverse']
        entry['candidates'] = keep + openverse(s)
        OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False))
    print('wrote', OUT.relative_to(ROOT))

if __name__ == '__main__':
    main()
