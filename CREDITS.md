# Kreditering

## Lyd
Lydeffektene i `assets/sfx/` er generert med **ElevenLabs Sound Effects** (<https://elevenlabs.io>) og valgt ut ved lytting (`tools/sfx/selection.json`). Unntaket er slurken (`drink`), som er et CC0-opptak fra Freesound (se under).

- **Lisens:** ElevenLabs gratisplan, ikke-kommersiell bruk, kreditering til elevenlabs.io påkrevd. Batteribytte er en ikke-kommersiell demo. Skal siden brukes kommersielt, må lydene lages på nytt på en betalt plan eller byttes med CC0-lyd.
- **Kreditering på siden:** «Lyd: ElevenLabs» nederst til høyre.
- **Promptene** for hver lyd står i `tools/sfx/elevenlabs.py`. Variantene som ble valgt står i `tools/sfx/selection.json`.

| Lyd | Variant | Brukes til |
|---|---|---|
| pop, spray, fizz | pop_3, spray_3, fizz_3 | Fliken åpnes (steg 8) |
| charge, full, powerDown, tick | charge_1, full_3, powerDown_2, tick_1 | Ladingen (steg 7) |
| crush | crush_3 | KNAS (steg 4) |
| reject, accept, scanBeep, rollers, lock | reject_3, accept_1, scanBeep_3, rollers_2, lock_3 | Skanneren (steg 2–3) |
| suck, gulp, grab, drop | suck_1, gulp_1, grab_2, drop_1 | Dra inn (steg 1) |
| click, printer | click_2, printer_1 | PANT-knappen og lappen (steg 5) |
| rumble, rattle, clank, thud, whoosh | rumble_2, rattle_1, clank_1, thud_2, whoosh_3 | Boksen sitter fast (steg 5–6) |
| hum, room | hum_3, room_2 | Maskinen og natten rundt (hele veien) |
| ui | ui_2 | Knappene |
| drink | Freesound 194808 | Slurken (steg 8b) |

**Slurken:** «Sip of coffee, swallow then 'ah'» av odditonic, <https://freesound.org/people/odditonic/sounds/194808/>, CC0 1.0 (ingen kreditering påkrevd, men den står her). Klippet, støyredusert og tonet ut.

Lyden lages i nettleseren (Web Audio) hvis en fil ikke lastes.

## Skrift
Archivo Black (Omnibus-Type), SIL Open Font License 1.1.

## Kode
three.js (MIT), bygget med esbuild (MIT).
