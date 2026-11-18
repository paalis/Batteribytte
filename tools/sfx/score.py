#!/usr/bin/env python3
"""Batteribytte · score the measured sound candidates (step 4 of the sound brief) and rank the top 3 per sound.

Nobody has listened yet: these are objective proxies from the measurements in candidates.json ("m") and the
metadata. They sort the list for the listening page; the ear decides.

Each candidate gets five scores, 0–10:
  fit      does it look like the brief's sound? Spectral centroid inside the band expected for that sound, a length
           that fits after trimming, and not near-silent. (For generated sounds the prompt *is* the description, so
           the text cannot separate the variants; only the measurements can.)
  tech     technical quality: not near-silent, signal-to-noise for one-shots, no clipping, true peak not over 0 dBTP,
           no late start
  license  CC0 10 · CC BY 8 · ElevenLabs free plan (non-commercial, attribution) 4: allowed for this non-commercial
           site, but it ties the site to that use
  loop     loops only: level step and spectral change at the crossfaded seam, the raw click, how even it is
  mix      how easily it sits in the mix: loudness near the target for its role, headroom, little to trim

total = 0.30 fit + 0.30 tech + 0.20 mix + 0.10 license + 0.10 loop (one-shots: the loop weight goes to tech)
"""
import json, math, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
DB = ROOT / 'tools/sfx/candidates.json'

# expected spectral centroid band (Hz) and target loudness (LUFS) per sound: bright transients, mid machines, low thumps
BAND = {
    'pop': (3000, 9000, -16), 'fizz': (4000, 12000, -24), 'spray': (2500, 9000, -18), 'charge': (800, 8000, -22),
    'full': (1500, 6000, -16), 'powerDown': (500, 5000, -20), 'hum': (120, 1500, -34), 'crush': (1500, 6000, -14),
    'reject': (300, 3000, -16), 'accept': (800, 4000, -18), 'scanBeep': (1500, 5000, -20), 'suck': (800, 6000, -18),
    'gulp': (150, 2000, -18), 'rollers': (300, 4000, -26), 'lock': (1000, 6000, -18), 'click': (1000, 7000, -20),
    'printer': (1500, 7000, -20), 'rumble': (80, 1200, -22), 'rattle': (400, 4000, -18), 'clank': (800, 5000, -18),
    'thud': (80, 1200, -16), 'drop': (800, 5000, -20), 'whoosh': (300, 4000, -20), 'tick': (1000, 6000, -22),
    'grab': (800, 6000, -24), 'ui': (800, 5000, -26), 'room': (100, 2000, -38),
}
LIC = {'CC0 1.0': 10}

def clamp(x, a=0.0, b=10.0):
    return max(a, min(b, x))

def band_score(c, lo, hi):
    if lo <= c <= hi:
        return 10.0
    d = math.log2(lo / c) if c < lo else math.log2(c / hi)          # octaves outside the band
    return clamp(10 - 4 * d)

def score(sid, kind, length, c):
    m = c['m']
    lo, hi, target = BAND[sid]
    silent = m['lufs'] is None or m['lufs'] < -45
    body = m['dur'] - m['lead'] - m['tail']
    fit = band_score(max(m['centroid'], 1), lo, hi)
    if kind == 'E' and body < length[0] * 0.5:
        fit -= 2                                                     # too short to be the thing
    if silent:
        fit = min(fit, 1)
    tech = 10.0
    if silent:
        tech = 1
    else:
        if kind == 'E':
            tech -= 0 if m['snr_db'] >= 40 else 2 if m['snr_db'] >= 20 else 4
        tech -= 3 * min(m['clip'], 2)
        tech -= 1 if (m['tp_db'] or -99) > 0 else 0
        tech -= 1 if m['lead'] > 0.05 else 0
    lic = LIC.get(c['license'], 8 if c['license'].startswith('CC BY') else 4)
    loop = None
    if kind == 'L' and m.get('loop'):
        l = m['loop']
        loop = clamp(10 - 2.5 * l['seam_db'] - 4 * l['seam_cent'] - 30 * l['seam_jump'] - 0.5 * max(0, l['steady'] - 1.5))
    mix = 10.0
    if not silent:
        mix -= min(4, abs(m['lufs'] - target) / 3)                   # every 3 LU from the target costs a point
        mix -= 1 if m['peak_db'] > -1 else 0                         # no headroom
        mix -= 1 if kind == 'E' and m['tail'] > 0.3 else 0          # a long tail to trim
    else:
        mix = 1
    w_tech = 0.30 + (0.10 if loop is None else 0)
    total = 0.30 * fit + w_tech * tech + 0.20 * clamp(mix) + 0.10 * lic + (0.10 * loop if loop is not None else 0)
    return dict(fit=round(clamp(fit), 1), tech=round(clamp(tech), 1), license=lic, loop=None if loop is None else round(loop, 1),
                mix=round(clamp(mix), 1), total=round(total, 2))

def brief_rows():
    """when / what / priority per sound, from the table in docs/sound-brief.md"""
    rows = {}
    for line in (ROOT / 'docs/sound-brief.md').read_text().splitlines():
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) >= 8 and cells[0].isdigit():
            rows[cells[1].strip('`')] = dict(n=int(cells[0]), when=cells[4], what=cells[5], prio=int(cells[6]) if cells[6].isdigit() else 3)
    return rows

def write_audition(data):
    """the listening page's data: the top 3 per sound, with what the page shows"""
    rows, out = brief_rows(), []
    for sid, e in data.items():
        by = {c['id']: c for c in e['candidates']}
        top = []
        for cid in e.get('top3', []):
            c = by[cid]; m = c['m']
            top.append(dict(id=cid, source=c['source'], title=c['title'], creator=c['creator'], license=c['license'],
                            attribution=c.get('attribution'), commercial_ok=c.get('commercial_ok'), prompt=c.get('prompt'),
                            file=c.get('local') or c.get('file'), rank=c['rank'], score=c['score'],
                            m=dict(dur=m['dur'], lufs=m['lufs'], peak=m['peak_db'], tp=m['tp_db'], lead=m['lead'], tail=m['tail'],
                                   centroid=m['centroid'], snr=m['snr_db'], loop=m.get('loop'))))
        out.append(dict(id=sid, kind=e['kind'], length=e['length'], **rows.get(sid, {}), top=top,
                        measured=sum('m' in c for c in e['candidates']), found=len(e['candidates'])))
    out.sort(key=lambda r: r.get('n', 99))
    (ROOT / 'tools/sfx/audition.json').write_text(json.dumps(out, indent=1, ensure_ascii=False))

def main():
    data = json.loads(DB.read_text())
    for sid, e in data.items():
        ranked = []
        for c in e['candidates']:
            if 'm' in c:
                c['score'] = score(sid, e['kind'], e['length'], c)
                ranked.append(c)
        ranked.sort(key=lambda c: -c['score']['total'])
        e['top3'] = [c['id'] for c in ranked[:3]]
        for c in e['candidates']:
            c.pop('rank', None)
        for i, c in enumerate(ranked):
            c['rank'] = i + 1
    DB.write_text(json.dumps(data, indent=1, ensure_ascii=False))
    write_audition(data)
    for sid, e in data.items():
        best = [c for c in e['candidates'] if c.get('rank') == 1]
        if best:
            s = best[0]['score']
            print(f"{sid:10s} top3 {', '.join(e['top3']):40s} best {s['total']:.2f} (fit {s['fit']} tech {s['tech']} mix {s['mix']} loop {s['loop']})")

if __name__ == '__main__':
    main()
