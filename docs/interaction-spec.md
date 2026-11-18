# Batteribytte: interaksjonsspesifikasjon (konsept B, «Pantemaskinen»)

Konsept, vurdering og valg står i `docs/concept.md`.

**Idé:** Batteribytte på norsk. Du panter det flate batteriet og får et fullt tilbake. Alt skjer i én 3D-verden: en nattlig pantemaskin under skiltet «BATTERIBYTTE», bygget i Blender og kjørt i sanntid. Det er ingen film og ingen paneler. All tekst står på maskinens skjerm og på pantelappen.

## Flyt (sju handlinger, ulik type hver gang)

| # | Handling (mobil · mus) | Tastatur | Hva som skjer | Overraskelsen |
|---|---|---|---|---|
| 0 | | | Maskinen våkner: neon og skjerm flimrer på, og den lyser «FLATT BATTERI? SETT INN HER». Du holder en grå, flat Battery-boks. | Logoens siste strek blinker rødt. |
| 1 | **Dra** boksen mot hullet | Enter | Boksen følger fingeren, legger seg ned og forsvinner inn i hullet. Maskinen suger den inn. | **Kameraet dykker etter, inn i maskinen.** |
| 2 | | | I skannekammeret spinner boksen på rullene under røde laserstreker, stopper, og **AVVIST** («STREKKODEN VISES IKKE»). | Den kjente irritasjonen fra pantemaskinen. |
| 3 | **Rull** boksen (dra opp og ned, med treghet) | Pil opp og ned | Når strekkoden vender mot skanneren: grønt pip og **GODKJENT**. | |
| 4 | | | Pressen knuser boksen i sakte film: **KNAS**. Skjermen rister, og telleren sier «BATTERIER BYTTET I DAG: n». Kameraet trekker seg ut av maskinen. | |
| 5 | **Trykk** på den grønne PANT-knappen | Enter | Knappen går inn, og pantelappen skrives ut i rykk. Så buldrer maskinen: «FEIL 0xBATT · BATTERIET SITTER FAST». | Den nye boksen sitter fast i luka. |
| 6 | **Rist** telefonen, eller dra fram og tilbake over skjermen | R eller Mellomrom flere ganger | Maskinen rister, og en måler på skjermen fylles. Etter seks rist faller boksen, luka slår, og boksen svever opp foran deg mens den snurrer. | |
| 7 | **Hold** på boksen | Hold Mellomrom (Enter lader av seg selv) | **Logoens «+ ‖» fylles nedenfra som en batterimåler.** Lynårene vokser, en tone stiger, boksen dirrer, og kameraet skyver seg innover. Ved 100 %: «DRA FLIKEN OPP». | Logoen *er* batteriet. |
| 8 | **Flikk** fliken opp (sveip opp, eller trykk på boksen) | Pil opp eller Enter | Smell, blits, sprut i sakte film (Cycles-sprite), skum som renner ned, lynene topper. Kameraet trekker seg ut til heltebildet: maskinen, boksen som snurrer, og lappen som henger ut. | |
| 9 | **Del** pantelappen, eller «Bytt igjen» | Tab, Enter | Pantelappen kommer fram og kan deles som bilde (Web Share med fil) eller som lenke, som kopieres. | Premien er en gjenstand: «PANTELAPP · 1 × BATTERI, FLATT · PANTET · 1 × BATTERY FRESH · LADET · DIN TUR?» |

**Handlingsknappen** nederst sier alltid hva neste handling er («Dra batteriet inn», «Rull boksen», «Trykk PANT», «Rist maskinen», «Hold for å lade», «Åpne»).
- Trykker du på den, gjøres handlingen for deg. Det er alternativet til bevegelser og presisjon (WCAG 2.5.1 og 2.5.7).
- I hold-steget holder du den som boksen. Et kort trykk lader av seg selv.
- Fokus flyttes til knappen ved hvert nytt steg.

## Kamera (én rigg, ett kamera, myke overganger)

Stasjonene er felles for siden og Blender-stillbildene: `src/pant/world.js` (`ST`) og `tools/blender/render_stills.py` (`STATIONS`).

| Stasjon | Når |
|---|---|
| start | Maskinen forfra, boksen i hånda di |
| (dykk) | Gjennom hullet, i 1,6 s |
| inside | Skannekammeret ovenfra |
| button | PANT-knappen og lappesporet |
| hatch | Luka |
| hero | Boksen som svever foran maskinen |
| finale | Heltebildet |

Pekeren gir litt parallakse (bare med mus). Kameraet rister ved knaset, smellet og fallet.

## Lyd og haptikk (`src/pant/sound.js`)
- **Lyden lages i nettleseren.** Den starter på første trykk, er på som standard, og «Lyd» (eller M) slår den av.
- **Alt går gjennom én kompressor,** så alle effektene får samme lydstyrke.
- **Lydene:** maskinens summing, sug, ruller, skannepip, avvisning (lav summer), godkjent (to toner), knas (slag, knitring og dunk), klikk, skriver, bulder, skrangling, dunk, ladetone som stiger, «full» (akkord) og smell med brus.
- **Vibrasjon** (`navigator.vibrate`, bare Android) på hvert mekanisk steg.
- **Risting med telefonen** bruker `devicemotion`. iOS ber om tillatelse ved første trykk.

## Lett reserve (`src/pant/lite.js`)
Ved **prefers-reduced-motion**, **uten WebGL**, eller hvis 3D-lastingen feiler:
- Samme historie fortelles i sju stillbilder fra Cycles (`assets/pant/stills/*.webp`, rendret fra de samme kamerastasjonene).
- Teksten fra maskinens skjerm vises som bildetekst.
- Hvert steg er ett trykk på handlingsknappen (eller tasten).
- Ingen bevegelse og ingen risting.
- Pantelappen og delingen er de samme.

## Tilgjengelighet
- `h1` (skjult) med sidens navn.
- Et live-område forteller hva som skjer i hvert steg. Teksten står i `STEPS` i `src/pant/main.js`.
- Alle handlinger kan gjøres med tastatur og med handlingsknappen.
- Pantelappen har en beskrivende alt-tekst.

## Nettvekt (det som faktisk lastes)
Se tabellen i README. Store filer lastes i bakgrunnen etter første opptegning. Plakaten (stillbildet av åpningen) vises med en gang, og 3D-scenen toner inn over den når den er klar.

## Filer
- **`index.html`, `style.css`:** siden. **`lib/pant/`:** bygget med `tools/build-pant.sh` fra `src/pant/`.
  - `main.js` velger 3D eller reserve og styrer ord, taster og lapp.
  - `world.js` er three.js-scenen og historien.
  - `lite.js`, `sound.js`, `receipt.js` og `bloom.js`.
- **Blender** (`tools/blender/`, Blender som Python-modul: `pip install bpy==5.3.0 pillow`):
  - `build_machine.py` → `assets/pant/machine.glb` (maskin og rom)
  - `build_can.py` → `assets/can/battery-can.glb` (boksen: etikett, midlertidig strekkode bak, lyn, tapp og skum) og `assets/pant/meter.webp` (logoen som måler)
  - `render_spray.py` → `assets/can/spray.webp`
  - `render_stills.py` → `assets/pant/stills/`
