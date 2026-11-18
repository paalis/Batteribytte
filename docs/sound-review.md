# Batteribytte: vurdering av lydkandidater (steg 4)

Ingen har lyttet ennå. Poengene er objektive mål som rangerer kandidatene for lyttesiden. Det er du som avgjør på øret.

## Kildene

| | Openverse | Freesound | ElevenLabs |
|---|---|---|---|
| **Hva det er** | Søkeindeks over åpne verk | Lydarkivet selv | Generert fra en tekstbeskrivelse |
| **Treff** | 5–10 per lyd, 247 totalt | Ikke tilgjengelig herfra | 3 per lyd, 81 totalt (pluss 1 test) |
| **Lisens** | Nesten alle CC0, resten CC BY | Ikke tilgjengelig herfra | Gratisplanen: ikke-kommersiell, kreditering påkrevd |
| **Målt** | 0. Filene ligger på `cdn.freesound.org`, som svarer 403 herfra | 0 | 81 av 81 |
| **Teknisk** | Ikke målt | Ikke målt | 44,1 kHz stereo mp3. Ingen målbar klipping, men 19 filer har topper på 0 dBFS og 15 går over 0 dB i true peak. Mange korte lyder har 0,2–0,8 s stillhet til slutt. |
| **Svakheter** | Bare metadata. Søk med fraser bommer ofte (f.eks. «Power hammer» under `suck`, en skriver under `scanBeep`). API-et ga ofte HTTP 500. | Tilgangen må rettes | Fem varianter er nesten stille: én hver av `lock` og `tick`, og to hver av `thud` og `clank`. Loopene for `rollers` og `room` skjøtes dårlig. |
| **Pris** | Gratis, anonymt: 20 kall i minuttet og 200 per døgn | Gratis med nøkkel | Ca. 2 600 credits for alt: 20 credits per sekund, ikke 40 som dokumentasjonen sier |

**Anbefaling:** ElevenLabs er hovedkilden nå. Siden skal ikke brukes kommersielt, så gratisplanen holder med kreditering, og hver lyd er laget til sitt øyeblikk. Freesound (direkte, eller gjennom Openverse) er verdt å beholde når tilgangen virker:
- for lydene der ElevenLabs bommet (`lock`, `clank`, `thud`, `tick`)
- for ekte opptak av en boks som åpnes og knuses
- for å få CC0 overalt hvis siden en gang skal brukes kommersielt

Openverse alene gir lite ekstra. Lydene der er nesten bare Freesound-filer, uten nedlastingstall og vurderinger.

## Poeng (`tools/sfx/score.py`)

Hver kandidat får 0–10 på fem punkter:

| Punkt | Hva det måler |
|---|---|
| **Passer** | Spektralt tyngdepunkt innenfor båndet vi venter for lyden, en lengde som holder etter kutting, og at den ikke er nesten stille. For genererte lyder er prompten selve beskrivelsen, så teksten skiller ikke variantene fra hverandre. Bare målingene gjør det. |
| **Teknisk** | Signal/støy for korte lyder, klipping, true peak over 0 dB og sen start |
| **Miks** | Lydstyrke nær målet for rollen, takhøyde, og lite som må kuttes |
| **Loop** | Bare for loopene: nivåhopp og klangendring i skjøten med 40 ms overtoning, klikk uten overtoning, og hvor jevn loopen er |
| **Lisens** | CC0 gir 10, CC BY 8, ElevenLabs gratisplan 4. Lisensen er lik for alle ElevenLabs-variantene, så den påvirker ikke rangeringen. |

**Samlet:** 0,30 passer + 0,30 teknisk + 0,20 miks + 0,10 lisens + 0,10 loop. For korte lyder går loopvekten til teknisk.

## Topp 3 per lyd (ElevenLabs)

Hver celle viser varianten, samlet poeng og eventuelle advarsler: «nesten stille» (under −45 LUFS), true peak over 0 dB, og nivåhopp i loopskjøten.

| # | Lyd | Type | Topp 3 |
|---|---|---|---|
| 1 | `pop` | Engang | 1 (8.8) · 3 (8.7) · 2 (8.6) |
| 2 | `fizz` | Loop | 1 (9.0, skjøt 1.29 dB) · 3 (8.4, skjøt 0.05 dB) · 2 (8.1, skjøt 1.97 dB) |
| 3 | `spray` | Engang | 2 (8.8) · 3 (8.7, TP +0.3) · 1 (8.6, TP +0.7) |
| 4 | `charge` | Loop | 2 (8.6, skjøt 0.24 dB) · 1 (8.3, skjøt 0.09 dB) · 3 (7.3, TP +0.2, skjøt 1.19 dB) |
| 5 | `full` | Engang | 3 (8.3, TP +0.5) · 2 (7.4, TP +1.0) · 1 (6.8, TP +0.3) |
| 6 | `powerDown` | Engang | 2 (8.6) · 3 (8.2) · 1 (7.6) |
| 7 | `hum` | Loop | 3 (9.0, skjøt 0.18 dB) · 2 (8.0, skjøt 1.71 dB) · 1 (7.8, skjøt 3.17 dB) |
| 8 | `crush` | Engang | 3 (8.6, TP +0.2) · 2 (8.4, TP +0.2) · 1 (7.9, TP +0.6) |
| 9 | `reject` | Engang | 3 (9.3) · 1 (9.1) · 2 (8.8) |
| 10 | `accept` | Engang | 1 (8.7) · 3 (8.6) · 2 (8.2, TP +0.1) |
| 11 | `scanBeep` | Engang | 2 (8.7) · 3 (8.5) · 1 (8.1, TP +0.1) |
| 12 | `suck` | Engang | 1 (9.1) · 2 (8.4) · 3 (8.3, TP +0.4) |
| 13 | `gulp` | Engang | 2 (9.2) · 1 (8.8) · 3 (8.5, TP +0.1) |
| 14 | `rollers` | Loop | 2 (8.4, skjøt 1.88 dB) · 3 (7.7, skjøt 1.03 dB) · 1 (7.3, skjøt 1.18 dB) |
| 15 | `lock` | Engang | 3 (8.2) · 2 (8.2) · 1 (1.0, nesten stille) |
| 16 | `click` | Engang | 2 (9.0) · 3 (8.9) · 1 (8.6) |
| 17 | `printer` | Engang | 3 (7.8) · 1 (7.7) · 2 (7.6) |
| 18 | `rumble` | Loop | 2 (9.0, skjøt 0.17 dB) · 3 (8.6, skjøt 2.11 dB) · 1 (8.5, skjøt 1.22 dB) |
| 19 | `rattle` | Engang | 1 (9.4) · 2 (8.6) · 3 (8.6) |
| 20 | `clank` | Engang | 1 (8.6) · 2 (8.6) · 3 (1.3, nesten stille) |
| 21 | `thud` | Engang | 2 (8.6) · 1 (1.3, nesten stille) · 3 (1.3, nesten stille) |
| 22 | `drop` | Engang | 1 (8.9) · 3 (8.8) · 2 (8.7) |
| 23 | `whoosh` | Engang | 3 (8.7) · 1 (8.2, TP +0.1) · 2 (8.2) |
| 24 | `tick` | Engang | 1 (8.3) · 3 (8.0) · 2 (1.3, nesten stille) |
| 25 | `grab` | Engang | 1 (8.9) · 2 (8.9) · 3 (8.7) |
| 26 | `ui` | Engang | 2 (8.6) · 3 (8.2) · 1 (7.5) |
| 27 | `room` | Loop | 2 (8.2, skjøt 1.41 dB) · 1 (8.2, skjøt 3.12 dB) · 3 (7.8, skjøt 1.48 dB) |

## Bør lages på nytt eller hentes fra Freesound
- **`lock`, `clank`, `thud`, `tick`:** bare én eller to varianter har lyd. Promptene bør skrives om, for eksempel «loud», «close-up» og et konkret materiale.
- **`rollers`:** loopskjøten er svak (1–1,9 dB nivåhopp). Den bør lages med `loop: true` og en jevnere beskrivelse, eller loopes manuelt.
- **`room`:** loopskjøten er svak (1,4–3,1 dB), og lydene består nesten bare av dyp brumming. Den kan droppes; `hum` dekker behovet.
- **`hum`:** nesten bare dyp brumming. Den kan få et lag med neonsurr i tillegg.

## Lyttesiden (steg 5)
`tools/sfx/audition.html` viser topp 3 per lyd fra `tools/sfx/audition.json`. Du kan spille av (loopene går i loop), se målinger, poeng, lisens og prompt, velge én variant eller «Ingen passer», og skrive en kommentar. Valgene eksporteres som `selection.json`: kopier teksten, eller bruk «Last ned» når siden er åpnet lokalt.

**Lokalt** (lydfilene i `assets/sfx/_candidates/` følger ikke med i git, så de må være generert eller kopiert dit):
```bash
python3 -m http.server 8000
```
Åpne deretter <http://localhost:8000/tools/sfx/audition.html> fra repoets rot. `npx serve` virker også, med adressen /tools/sfx/audition.html.
