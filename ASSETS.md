# Klipp til Batteribytte

Siden spiller fire klipp. Alle står i `clips.json`, og koden leser alt derfra.
For å bytte et klipp pakker du det med skriptet under og oppdaterer URL-en i `clips.json`. Koden endres ikke.

Klippene som ligger der nå, er placeholders rendret fra 3D-studioet (`film-clips/`, `tools/split-placeholders.sh`).
Bruk dem som start- og sluttbilder når du genererer, så stemmer overgangene: `assets/clips/*-first.webp` og `*-last.webp`.

## Felles krav

| | |
|---|---|
| Format | 9:16 portrett, levert som 720×1280 (generer gjerne 1080×1920, skriptet skalerer ned) |
| Bilder per sekund | 30 |
| Lyd | Ingen (siden lager lyden selv) |
| Størrelse | 2–4 MB per klipp etter pakking |
| Boks | Vår egen: Battery Fresh, gull til rødt, svart pluss-logo og «BATTERY» loddrett. Ingen andre merker eller logoer |
| Scene | Mørkt studio, nesten svart bakgrunn, hardt kaldt rim-lys fra begge sider bak, blankt mørkt gulv, lav tåke |
| Kamera | Boksen midt i bildet. Øverste ca. 25 % og nederste ca. 30 % er rolige, fordi tekst og knapper ligger der |
| Etikett | Bruk **bilde-til-video** med `assets/battery-fresh.webp` og start- og sluttbildet, ellers tegner modellen teksten feil |

Verktøy som tar både startbilde og sluttbilde (for eksempel Runway, Kling, Luma og Veo) gir best overganger.

## Klippene

### A · `idle`: venter (4 s, spilles i loop)
- **Startbilde = sluttbilde:** `idle-first.webp`. Loopen må gå sømløst.
- **Tilstand:** 0 %. Boksen står stille i tåka med kondens. Lyset er kaldt og dempet.
- **Prompt:**
  > Vertical 9:16 product shot, 4 seconds, seamless loop. A single energy drink can (use the reference image exactly:
  > gold-to-red gradient, black plus symbol, the word BATTERY vertical) stands on a glossy black floor in a dark studio.
  > Cold condensation droplets on the can, a thin layer of white fog drifting slowly across the floor. Hard cold rim
  > light from behind on both edges, the front of the can in soft shadow, high contrast, moody, almost black background.
  > The camera drifts a few degrees left and returns to the exact first frame. Photoreal macro commercial look,
  > shallow depth of field, 30 fps. No text overlays, no hands, no other brands.

### B · `charge`: lading (4 s, **skrubbes** av %-måleren)
- **Startbilde:** `charge-first.webp`, samme som idle. **Sluttbilde:** `charge-last.webp`, 100 %: boksen bakbelyst i varmt lys.
- **Tid = nivå:** bilde nr. *i* av 120 tilsvarer 6 + 94·i/119 %. Klippet bør ikke ha pauser.
- **Kutt er lov:** når man skrubber gjennom et kutt, slår siden til med zoom-støt, lysflimmer og whoosh, som et klipp i takt. Før kuttene inn i `charge.cuts` (sekunder).
- **Prompt:**
  > Vertical 9:16, 4 seconds, a fast commercial edit with speed ramps. Start on the exact start frame. 0–1 s: push in to
  > an extreme macro of cold condensation droplets on the label. 1 s: cut to a low dutch angle at floor level: ice cubes
  > fall in slow motion and splash on the glossy floor around the can. 2.1 s: cut to the top of the can from above, a
  > cold breath of vapour rises. 3 s: whip pan into a low heroic angle ending on the exact end frame. As it moves, a warm amber light grows behind the can until it glows. Dark studio, hard rim light,
  > fog on the floor, photoreal high-speed commercial look, 30 fps. No text overlays, no other brands.

### C · `open`: åpnes ved 100 % (4 s, spilles)
- **Startbilde:** `charge-last.webp`. **Sluttbilde:** `open-last.webp`, trioen i tåke.
- **Tider som siden bruker** (rett dem i `clips.json` hvis klippet ditt avviker):
  - `hit`: når flippen knepper (smell, sprut og ristet bilde), nå 0,25 s.
  - `cuts`: hvor klippet kutter (siden slår til med zoom-støt, lys og whoosh), nå 0,25 / 1,0 / 1,8 / 2,0 s.
  - `strikes` og `arcs`: valgfritt lyn tegnet live oppå klippet. Tomme nå, fordi placeholderen har lyn i selve klippet. Har AI-klippet ikke lyn, fyll dem inn (sekunder, og brøkdeler av bildet fra boks til boks).
  - `top`: hvor sprut og fizz kommer fra.
- **Prompt:**
  > Vertical 9:16, 4 seconds, fast commercial edit with speed ramps. Start on the exact start frame. 0.25 s: a fingertip
  > snaps the tab open, a burst of cold vapour and fine spray; slow-motion close-up from above as amber foam rises out
  > of the opening and spills over the rim. 1 s: cut to the side, foam running down the can over the droplets.
  > 1.8 s: whip pan; 2 s: three identical cans side by side on the glossy floor in thick low fog, blue-white lightning
  > arcing between them, warm light behind the middle one, the camera slowly pushing in. Dark moody studio, hard rim light, high contrast, photoreal, 30 fps. No text, no other brands.
  > (The page can also draw lightning live on top: if the clip has none, set `strikes` and `arcs` in clips.json.)

### D · `drain`: Nei (2 s, spilles)
- **Startbilde:** `drain-first.webp`, samme som idle. **Sluttbilde:** nesten svart.
- **Prompt:**
  > Vertical 9:16, 2 seconds. Start on the exact start frame. The studio lights die one by one, the rim light fades,
  > the can sinks into darkness and fog while the camera cranes slowly upward and away. Ends almost black. Photoreal,
  > moody, 30 fps. No text, no other brands.

## Pakking

Legg råklippene i `assets/clips-src/` (ignorert av git) og kjør:

```sh
tools/make-sequence.sh assets/clips-src/idle.mp4   idle
tools/make-sequence.sh assets/clips-src/charge.mp4 charge assets/clips 120  # 60–120 bilder
tools/make-sequence.sh assets/clips-src/open.mp4   open
tools/make-sequence.sh assets/clips-src/drain.mp4  drain
```

Skriptet lager:
- **For alle klippene:** en H.264-video (`<navn>.mp4`, uten lyd, `faststart`) og start- og sluttbilde i WebP.
- **For `charge` i tillegg:**
  - en WebP-sekvens (`charge/000.webp` …), som tegnes på `<canvas>` på telefon;
  - en video med nøkkelbilde på hvert bilde, til presis skrubbing på desktop:

```sh
ffmpeg -i charge.mp4 -an -vf "scale=720:1280" -c:v libx264 -pix_fmt yuv420p -crf 24 \
  -g 1 -keyint_min 1 -sc_threshold 0 -movflags +faststart charge-scrub.mp4
```

Endrer du antall bilder, oppdaterer du `count` i `clips.json`. Er en fil over 4 MB, øker du `-crf` i skriptet (23 → 26).

## Hosting: Vercel Blob

Ekte klipp skal ikke inn i git:
1. **Opprett lageret:** i Vercel opprett en Blob store under Storage, koble den til prosjektet og kopier `BLOB_READ_WRITE_TOKEN`.
2. **Last opp:**
   ```sh
   npm i --no-save @vercel/blob
   BLOB_READ_WRITE_TOKEN=… node tools/upload-clips.mjs
   ```
   Skriptet laster opp `assets/clips/` med samme stier og setter `base` i `clips.json`.
3. **Commit og deploy:** commit bare `clips.json`, og fjern placeholderne fra git hvis du vil.

## Ytelse og oppførsel

- **Lastes ved åpning:** bare idle-klippet. Sekvensen hentes etter 1,2 s, mens åpning og Nei hentes ved første trykk.
- **Minne på telefon:** bare de ca. 16 bildene rundt posisjonen holdes dekodet.
- **Redusert bevegelse:** viser start- og sluttbildene i stedet for video og effekter.
