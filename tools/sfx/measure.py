#!/usr/bin/env python3
"""Batteribytte · download the sound candidates and measure them (step 3 of the sound brief).

For every candidate in tools/sfx/candidates.json that has a preview_url (Openverse), and every generated file
(ElevenLabs, `file`):
  1. download to assets/sfx/_candidates/<sound>/<source>_<id8>.<ext> (git-ignored), once
  2. convert to 44.1 kHz WAV, keeping mono or stereo (<same name>.wav), for listening and analysis
  3. measure, and write the numbers back into candidates.json under "m":

  dur          length in s
  ch, sr0      channels; the original sample rate
  peak_db      sample peak, dBFS                 tp_db   true peak (ffmpeg ebur128), dBTP
  rms_db       RMS over the sound (from first to last moment above the threshold), dBFS
  lufs         integrated loudness (ffmpeg ebur128); very short sounds can read -70 (gated out)
  clip         clipped runs: >= 3 samples in a row at |x| >= 0.999
  lead, tail   silence before the first and after the last moment within 40 dB of the peak, s
  floor_db     noise floor: the 10th percentile of 20 ms RMS windows, dBFS
  snr_db       peak RMS window minus the noise floor, dB
  centroid     spectral centroid (energy weighted, frames within 30 dB of the loudest), Hz
  bright       share of energy above 4 kHz
  loop (loops only): a loop of the brief's length (or the whole file if shorter) cut from the steadiest stretch,
      joined with a 40 ms crossfade, and judged at the seam:
      seam_db     level step between the 150 ms before and after the join, dB
      seam_cent   spectral change across the join (|log2| of the centroid ratio, octaves)
      seam_jump   the sample step at the raw join, without crossfade (a click without a fade)
      steady      level spread across the loop, dB (std of 50 ms RMS): low = even, loops easily

  python3 tools/sfx/measure.py            # all (skips files already downloaded)
  python3 tools/sfx/measure.py pop fizz
"""
import json, re, subprocess, sys, time, pathlib, urllib.request
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
DB = ROOT / 'tools/sfx/candidates.json'
CAND = ROOT / 'assets/sfx/_candidates'
SR = 44100

def run(*a):
    return subprocess.run(a, capture_output=True, text=True)

def fetch(url, path):
    if path.exists() and path.stat().st_size > 0:
        return
    req = urllib.request.Request(url, headers={'User-Agent': 'sfx-measure/1.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        path.write_bytes(r.read())
    time.sleep(0.4)                                   # gentle on the CDN

def to_wav(src, dst):
    if not dst.exists():
        r = run('ffmpeg', '-v', 'error', '-y', '-i', str(src), '-ar', str(SR), '-c:a', 'pcm_s16le', str(dst))
        if r.returncode:
            raise RuntimeError(r.stderr[-300:])

def read_wav(path, ch=1):
    """(mono mix for analysis, the true per-channel peak)"""
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-ar', str(SR), '-'], capture_output=True)
    x = np.frombuffer(r.stdout, dtype=np.float32)
    if ch > 1:
        x = x[: len(x) // ch * ch].reshape(-1, ch)
        return x.mean(axis=1), float(np.max(np.abs(x))) if len(x) else 0.0
    return x, float(np.max(np.abs(x))) if len(x) else 0.0

def db(x):
    return float(20 * np.log10(max(x, 1e-9)))

def ebur(path):
    r = run('ffmpeg', '-nostats', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-')
    t = r.stderr
    i = re.findall(r'I:\s+(-?[\d.]+) LUFS', t)
    p = re.findall(r'Peak:\s+(-?[\d.]+|-inf) dBFS', t)
    return (float(i[-1]) if i else None), (float(p[-1]) if p and p[-1] != '-inf' else None)

def win_rms(x, n):
    k = len(x) // n
    if k == 0:
        return np.array([np.sqrt(np.mean(x ** 2))]) if len(x) else np.zeros(1)
    return np.sqrt(np.mean(x[:k * n].reshape(k, n) ** 2, axis=1))

def centroid(x):
    n = 2048
    if len(x) < n:
        x = np.pad(x, (0, n - len(x)))
    hop = n // 2
    fr = np.lib.stride_tricks.sliding_window_view(x, n)[::hop] * np.hanning(n)
    S = np.abs(np.fft.rfft(fr, axis=1)) ** 2
    f = np.fft.rfftfreq(n, 1 / SR)
    e = S.sum(axis=1)
    keep = e > e.max() * 1e-3
    S = S[keep]
    tot = S.sum()
    return float((S * f).sum() / tot), float(S[:, f > 4000].sum() / tot)

def loop_test(x, want_s):
    n = int(min(len(x), want_s * SR))
    w = int(0.05 * SR)
    if n < 4 * w:
        return None
    # the steadiest stretch of the wanted length (lowest level spread)
    rms = win_rms(x, w)
    per = n // w
    best, at = 1e9, 0
    for i in range(0, max(1, len(rms) - per + 1), max(1, per // 8)):
        s = np.std(20 * np.log10(rms[i:i + per] + 1e-9))
        if s < best:
            best, at = s, i
    seg = x[at * w: at * w + n].copy()
    xf = int(0.04 * SR)
    jump = float(abs(seg[-1] - seg[0]))
    looped = seg[:-xf].copy()
    fade = np.linspace(0, 1, xf)
    looped[:xf] = seg[:xf] * fade + seg[-xf:] * (1 - fade)       # the end blends into the start
    two = np.concatenate([looped, looped])
    j, h = len(looped), int(0.15 * SR)
    a, b = two[j - h: j], two[j: j + h]
    ca, cb = centroid(a)[0], centroid(b)[0]
    return dict(seam_db=round(abs(db(np.sqrt(np.mean(a ** 2))) - db(np.sqrt(np.mean(b ** 2)))), 2),
                seam_cent=round(abs(float(np.log2(max(ca, 1) / max(cb, 1)))), 3),
                seam_jump=round(jump, 4), steady=round(float(best), 2), loop_s=round(n / SR, 2))

def measure(src, wav, kind, length):
    pr = json.loads(run('ffprobe', '-v', 'error', '-show_entries', 'stream=channels,sample_rate', '-of', 'json', str(src)).stdout)
    st = pr['streams'][0]
    x, pk_true = read_wav(wav, int(st.get('channels', 1)))
    if len(x) == 0:
        raise RuntimeError('empty')
    pk = float(np.max(np.abs(x)))
    ab = np.abs(x)
    thr = pk * 10 ** (-40 / 20)
    idx = np.nonzero(ab > thr)[0]
    first, last = (idx[0], idx[-1]) if len(idx) else (0, len(x) - 1)
    body = x[first:last + 1]
    runs = np.diff(np.concatenate([[0], (ab >= 0.999).astype(int), [0]]))
    starts, ends = np.nonzero(runs == 1)[0], np.nonzero(runs == -1)[0]
    clip = int(np.sum((ends - starts) >= 3))
    r20 = win_rms(x, int(0.02 * SR))
    floor = db(float(np.percentile(r20, 10)))
    cen, bright = centroid(body)
    lufs, tp = ebur(wav)
    m = dict(dur=round(len(x) / SR, 3), ch=int(st.get('channels', 1)), sr0=int(st.get('sample_rate', 0)),
             peak_db=round(db(pk_true), 2), tp_db=tp, rms_db=round(db(float(np.sqrt(np.mean(body ** 2)))), 2), lufs=lufs,
             clip=clip, lead=round(first / SR, 3), tail=round((len(x) - 1 - last) / SR, 3),
             floor_db=round(floor, 1), snr_db=round(db(float(r20.max())) - floor, 1),
             centroid=round(cen), bright=round(bright, 3))
    if kind == 'L':
        m['loop'] = loop_test(body, length[1])
    return m

def main():
    want = set(sys.argv[1:])
    data = json.loads(DB.read_text())
    n = bad = 0
    for sid, entry in data.items():
        if want and sid not in want:
            continue
        d = CAND / sid; d.mkdir(parents=True, exist_ok=True)
        for c in entry['candidates']:
            try:
                if c.get('preview_url'):
                    ext = (c.get('filetype') or c['preview_url'].rsplit('.', 1)[-1]).lower()
                    src = d / f"{c['source']}_{str(c['id'])[:8]}.{ext}"
                    fetch(c['preview_url'], src)
                elif c.get('file'):
                    src = ROOT / c['file']
                else:
                    continue
                wav = src.with_suffix('.wav')
                to_wav(src, wav)
                c['local'] = str(src.relative_to(ROOT)); c['wav'] = str(wav.relative_to(ROOT))
                c['m'] = measure(src, wav, entry.get('kind', 'E'), entry.get('length', [0.5, 2]))
                c.pop('m_error', None)
                n += 1
            except Exception as e:
                c['m_error'] = str(e)[:200]; bad += 1
                print(f'  {sid} {c["id"]}: {e}', file=sys.stderr)
        DB.write_text(json.dumps(data, indent=1, ensure_ascii=False))
        print(f'{sid:10s} done')
    print(f'measured {n}, failed {bad}')

if __name__ == '__main__':
    main()
