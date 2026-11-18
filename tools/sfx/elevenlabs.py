#!/usr/bin/env python3
"""Batteribytte · generate sound-effect candidates with the ElevenLabs Sound Effects API.

Docs read first: https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert
  POST https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128
  body: text, duration_seconds (0.5–30), prompt_influence (0–1, default 0.3), loop (bool)
  cost: the docs say 40 credits per second with duration_seconds; the response header Character-Cost said 10 for
        0.5 s (20 per second) on this account, so the plan is priced at 20 and every call logs what it really cost
  key: the `xi-api-key` header. Locally: ELEVENLABS_API_KEY (from the environment or .env, never committed).
  In the cloud session the network proxy adds the header, so the variable can be absent.

Three variants per sound, each with an explicit short duration. Nothing is sent unless the whole plan fits in
--budget credits (pass ~60 % of what the account has left), and --go is given; without --go it only prints the plan.

  python3 tools/sfx/elevenlabs.py --budget 5000            # show the plan and its cost
  python3 tools/sfx/elevenlabs.py --budget 5000 --go       # generate
  python3 tools/sfx/elevenlabs.py --budget 900 --go pop fizz

Files: assets/sfx/_candidates/<sound>/elevenlabs_<n>.mp3; each is logged in tools/sfx/candidates.json with its
prompt, duration and license.
"""
import json, os, sys, time, pathlib, urllib.request, urllib.error

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'tools/sfx/candidates.json'
CAND = ROOT / 'assets/sfx/_candidates'
CREDITS_PER_S = 20
LICENSE = 'ElevenLabs gratisplan: ikke-kommersiell, kreditering til elevenlabs.io påkrevd'
VARIANTS = 3

# id: (duration in s (API minimum 0.5), loop?, prompt). Short sounds are made at 0.5 s and trimmed later.
PLAN = {
    'pop':       (0.8, False, 'Close-up of an ice-cold aluminium energy drink can being opened: crisp metallic tab click and a sharp pressurised tsst, studio quality, commercial'),
    'fizz':      (3.0, True,  'Close-up fizzing carbonated soda in an open aluminium can, dense fine bubbles crackling, seamless loop, no music'),
    'spray':     (1.5, False, 'Shaken soda can bursting open, wet foamy spray gushing out, splashy and energetic, commercial sound design'),
    'charge':    (4.0, True,  'Electric energy charging up, warm rising hum with crackling electricity, sci-fi power build, seamless loop'),
    'full':      (1.0, False, 'Satisfying fully charged stinger: bright electric zap followed by a clean shimmering ding, commercial'),
    'powerDown': (0.8, False, 'Electric power down, energy draining away, descending deflating whine'),
    'hum':       (6.0, True,  'Vending machine and neon sign humming at night, low warm electrical hum with faint fan, seamless loop'),
    'crush':     (1.0, False, 'Hydraulic press crushing an empty aluminium can, loud metallic crunch and crackle, close-up, punchy'),
    'reject':    (0.7, False, 'Bottle return machine rejecting an item: short low annoying error buzzer, two pulses'),
    'accept':    (0.6, False, 'Bottle return machine accepting an item: short clean two-tone confirmation beep'),
    'scanBeep':  (0.5, False, 'Single short supermarket barcode scanner beep'),
    'suck':      (0.8, False, 'Pneumatic machine sucking an object in, strong air suction whoosh into a tube'),
    'gulp':      (0.6, False, 'Can dropping deep inside a metal machine, hollow metallic thunk with short echo'),
    'rollers':   (2.0, True,  'Small electric motor spinning rubber rollers inside a machine, steady mechanical whir, seamless loop'),
    'lock':      (0.5, False, 'Magnetic latch snapping into place, solid mechanical click'),
    'click':     (0.5, False, 'Big chunky arcade push button pressed, solid plastic click'),
    'printer':   (1.6, False, 'Thermal receipt printer printing a short receipt, fast rhythmic chatter, ending with paper tear'),
    'rumble':    (3.0, True,  'Vending machine jammed and struggling, motor grinding and rumbling, metal shaking, seamless loop'),
    'rattle':    (0.5, False, 'Heavy metal vending machine cabinet shaken once, rattling metal panels'),
    'clank':     (0.5, False, 'Full aluminium drink can hitting a metal tray, short metallic clank'),
    'thud':      (0.5, False, 'Full drink can dropping onto a metal delivery tray, heavy dull thud'),
    'drop':      (0.5, False, 'Empty crushed aluminium can dropping and bouncing on metal, light tinny clatter'),
    'whoosh':    (0.8, False, 'Soft airy magical whoosh of an object floating upward'),
    'tick':      (0.5, False, 'Single short electronic meter tick, crisp relay click with a tiny tone'),
    'grab':      (0.5, False, 'Hand picking up an aluminium can, short grip and light metallic touch'),
    'ui':        (0.5, False, 'Very short soft muted user interface tap'),
    'room':      (10.0, True, 'Quiet night outside a convenience store, distant city traffic, soft wind, seamless loop'),
}

def key():
    k = os.environ.get('ELEVENLABS_API_KEY')
    env = ROOT / '.env'
    if not k and env.exists():
        for line in env.read_text().splitlines():
            if line.startswith('ELEVENLABS_API_KEY='):
                k = line.split('=', 1)[1].strip().strip('"\'')
    return k or 'proxy-injected'       # cloud session: the proxy replaces this header

def generate(text, dur, loop, path):
    body = json.dumps({'text': text, 'duration_seconds': dur, 'prompt_influence': 0.5, 'loop': loop}).encode()
    req = urllib.request.Request('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', data=body,
                                 headers={'xi-api-key': key(), 'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=120) as r:
        path.write_bytes(r.read())
        return int(r.headers.get('Character-Cost') or 0)

def main():
    args = sys.argv[1:]
    go = '--go' in args
    budget = float(args[args.index('--budget') + 1]) if '--budget' in args else 0
    names = [a for a in args if a in PLAN] or list(PLAN)
    cost = sum(PLAN[n][0] * CREDITS_PER_S * VARIANTS for n in names)
    for n in names:
        print(f'{n:10s} {VARIANTS} × {PLAN[n][0]:4.1f} s{" loop" if PLAN[n][1] else "     "}  = {PLAN[n][0] * CREDITS_PER_S * VARIANTS:6.0f} credits')
    print(f'total {cost:.0f} credits, budget {budget:.0f}')
    if cost > budget:
        sys.exit('over budget: nothing sent')
    if not go:
        sys.exit('plan only (add --go to generate)')
    data = json.loads(OUT.read_text()) if OUT.exists() else {}
    spent = [0]
    for n in names:
        dur, loop, text = PLAN[n]
        d = CAND / n; d.mkdir(parents=True, exist_ok=True)
        entry = data.setdefault(n, {'candidates': []})
        for i in range(1, VARIANTS + 1):
            p = d / f'elevenlabs_{i}.mp3'
            if p.exists() and any(c['source'] == 'elevenlabs' and c['id'] == f'{n}_{i}' for c in entry['candidates']):
                continue                                            # made already
            try:
                cost_real = generate(text, dur, loop, p)
                spent[0] += cost_real
                if spent[0] > budget:
                    sys.exit(f'spent {spent[0]} > budget {budget}: stopped')
            except urllib.error.HTTPError as e:
                sys.exit(f'{n} #{i}: HTTP {e.code} {e.read()[:300]!r}: stopped')
            entry['candidates'] = [c for c in entry['candidates'] if not (c['source'] == 'elevenlabs' and c['id'] == f'{n}_{i}')]
            entry['candidates'].append(dict(
                source='elevenlabs', id=f'{n}_{i}', title=f'{n} (generated #{i})', creator='ElevenLabs (generated)',
                license=LICENSE, commercial_ok=False, attribution_required=True,
                attribution='Lyd generert med ElevenLabs (elevenlabs.io)', duration=dur, loop=loop, prompt=text,
                prompt_influence=0.5, model='eleven_text_to_sound_v2 (default)', credits=cost_real,
                tags=[], downloads=None, rating=None, source_url='https://elevenlabs.io/sound-effects', preview_url=None,
                file=str(p.relative_to(ROOT)),
            ))
            OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False))
            print(f'  {n} #{i}: {p.stat().st_size // 1024} kB, {cost_real} credits (total {spent[0]})')
            time.sleep(0.5)

if __name__ == '__main__':
    main()
