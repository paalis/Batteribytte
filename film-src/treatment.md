# Batteribytte — studio film

**Idea (one sentence):** Three cold cans wait in a black studio; a beam of light finds the middle one and switches it on, so the viewer feels it is time to go and get one.
**Promise / hook (on screen by 3 s, sound off):** «DET ER TID FOR / BATTERIBYTTE!» — Archivo Black, ≥ 180 px at 1080 short side.
**Terms:** Batteribytte · Battery
**Audience · channel:** colleagues and friends, a shared link, mostly phones, starts muted (sound after the first tap).
**Spec:** 1920×1080 and 1080×1920, 30 fps, 13.0 s = intro 0–9.0, Ja 9.0–11.0, Nei 11.0–13.0 (the page plays the segments).

## Benchmark
- Monster Energy Ultra spot (supplied): learn the black studio, hard cuts ~1/s that accelerate, cold side/rim light,
  macro of condensation, a beat of black before the reveal, fog + light-sweep reveal of three cans, end on the product
  with its reflection. Don't take: its logo, can, shots of pouring/ice (no footage of our own), its type.
- Dr Pepper spot (supplied): learn big stacked heavy type over the product, words landing on beats. Don't take: copy, colours.
- ASMR can opening (supplied): learn the dark, side-lit macro of the can top. Smoke clip: low rolling white smoke on black.

## Structures considered
1. Montage on the beat (Monster grammar) ending in a fog reveal + light sweep. **Chosen**: it is the reference the user sent and needs only the product.
2. One continuous orbit round the trio — rejected: no cuts, loses the energy of the reference.
3. Type-led kinetic film over a static can — rejected: the product becomes a backdrop.

## Dials
Clock: music grid, designed, 120 bpm (beat 0.5 s) · Continuity: cut on the beat · Register: clean/premium, real 3D light, DOF, bloom
Text policy: type as hero once (the hook), otherwise none · Constant: the hero can, always centre
Accent: the can's own gold→pink is the only colour; the studio is blue-black (#07070a), light is cold white.

## Arc
Hook 0–3 s: reveal swing on the trio → macro → can top → type slam. Turn at 4.5: cut to black (silence).
Hero moment = payoff at 6.5 s: the sweep reaches the middle can and it lights up from behind.
Arc quantity: light on the hero can — rim only (0–4.5) → dark (4.5) → swept (5.6–6.5) → lit (6.5–9).
Ending answers the opening: the close oblique can of frame 0 becomes the lit can in the wide packshot.
Answers: Ja = the battery meter on the can charges red→full, the backlight and fog swell. Nei = the studio lights die.

## Beat sheet
| # | t | What | Read | Cue | Camera | Out |
|---|---|---|---|---|---|---|
| 1 | 0.0–1.0 | three cans in the dark, rim light, fog | the product | b0 | close oblique → wide, expo.out | cut on b2 (next detail) |
| 2 | 1.0–1.5 | macro: drops on the label, light glides | it is cold | b2 | close, slow drift | cut b3 (scale: up the can) |
| 3 | 1.5–2.0 | the can top, a cold breath rises | it is opening | b3 | low on the lid | cut b4 (type) |
| 4 | 2.0–4.5 | DET ER TID FOR / BATTERI / BYTTE! | the hook | b4,b4.5,b5 | mid, slow push | cut to black b9 |
| 5 | 4.5–5.0 | black, silence | — | b9 | — | cut b10 |
| 6 | 5.0–7.5 | trio in fog; sweep 5.6–6.5; hero lights at 6.5 | the reveal | b10,b13 | wide, slow push | settle |
| 7 | 7.5–9.0 | packshot, hold (page shows the question) | — | b15 | land | (pause) |

## Sound plan
Synthesized (om sound), cinematic/dark; silence 4.5–5.0; loudest hit at 6.5 (impact + subdrop). SFX: whoosh on the reveal,
hit on cuts 1.0/1.5, a breath (whoosh, high) at 1.6, impact on «BYTTE!» 2.5, riser 5.0–6.5.

## Truth
No claims or numbers. The battery meter drawn on the can's «=» bars is an illustration of the page's joke.

## Risks
The can is the real photo wrapped on a lathe of its own silhouette: the back is mirrored, so the camera stays within ±50°.
No liquid shots (no footage of our own) — the film shows only what we really have.

## DECISIONS
- 3D studio (Three.js) over CSS layers, because light sweeps, reflections and depth of field must be physical, not painted.
- No pour or ice shots, because the supplied clips are other brands' footage and code-drawn liquid looked fake before.
- 120 bpm designed grid, 9 s intro, because the reference cuts ~1/s and a fun page must reach its question fast.
