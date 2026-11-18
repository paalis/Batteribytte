# Batteribytte: interaksjonsspesifikasjon (konsept B, «Pantemaskinen»)

Konsept, vurdering og valg står i `docs/concept.md`.

**Idé:** Batteribytte på norsk. Du panter det flate batteriet og får et fullt tilbake. Alt skjer i én 3D-verden: en nattlig pantemaskin under skiltet «BATTERIBYTTE», bygget i Blender og kjørt i sanntid. Det er ingen film og ingen paneler. All tekst står på maskinens skjerm og på pantelappen.

## Flyt (sju handlinger, ulik type hver gang)

| # | Handling (mobil · mus) | Tastatur | Hva som skjer | Overraskelsen |
|---|---|---|---|---|
| 0 | | | Maskinen våkner: neon og skjerm flimrer på, og den lyser «FLATT BATTERI? SETT INN HER». Du holder en grå, flat Battery-boks. | Logoens siste strek blinker rødt. |
| 1 | **Dra** boksen mot hullet | Enter | Boksen følger fingeren i 3D (en fjær). Når du griper den, løfter den seg mot deg og blir litt større, og den lener seg i retningen du drar. Nær hullet legger den seg ned, og hullet trekker i den: en magnet som blir sterkere jo nærmere den er, mens ringen lyser opp og vokser. Slipper du langt unna, spretter den tilbake med en liten overshoot. Slipper du nær, suges den inn med en snurr, og ringen «svelger». | **Kameraet dykker etter, inn i maskinen**, langs én myk bane. Synsfeltet åpner seg gjennom hullet, bildet smøres i farten, og lyset skifter underveis. |
| 2 | | | I skannekammeret spinner boksen fort på rullene, mens laserviften sveiper opp og ned langs den. Den bremser, vugger og stopper med strekkoden ned: **AVVIST** («STREKKODEN VISES IKKE»). Boksen rykker «nei» på rullene, kammeret blinker rødt, og kameraet rykker til. | Den kjente irritasjonen fra pantemaskinen. |
| 3 | **Rull** boksen (dra over den, med treghet) | Pil opp og ned | Overflaten følger fingeren én til én. Draget gjøres om til rotasjon ut fra hvor boksens nære side faktisk beveger seg på skjermen. Mens strekkoden kommer rundt, går laserne fra rødt mot ravgult og pipene går fortere. Vender den mot skanneren, låser den seg med et magnetisk smekk, klikk og en liten puls, og gir **GODKJENT**. Rører du den ikke, vugger den litt på rullene som et hint. | |
| 4 | | | **KNAS**: pressen kommer fort ned og stopper på boksen (et kort stillbilde i treffet). Deretter knuser den boksen i sakte film. Toppen av boksen følger pressen nøyaktig, veggen krøller seg i skrukker, og kameraet rykker inn. Telleren tikker fra n − 1 til n. Rullene glir fra hverandre, og den flate boksen faller ned mellom dem mens den tumler. Kameraet trekker seg ut av maskinen langs samme myke bane som på vei inn. | |
| 5 | **Trykk** på den grønne PANT-knappen | Enter | Knappen går inn under fingeren, lyser og blir inne til du slipper. Pantelappen glir ut av sporet i rykk, som fra en termoskriver: det er papiret som beveger seg, ikke trykket som klemmes. Så svaier den. Den nye boksen kommer rasende ned og kiler seg fast på skrå i luka, og maskinen rykker og kveles: «FEIL 0xBATT · BATTERIET SITTER FAST». | Den nye boksen sitter fast i luka. |
| 6 | **Rist** telefonen, eller dra fram og tilbake over skjermen | R eller Mellomrom flere ganger | Maskinen er tung og fjærende. Hvert rist dytter den i retningen du ristet, og den gynger tilbake. Boksen henger etter maskinen og løsner gradvis: den sklir, vipper og synker, mens en måler på skjermen fylles. Når den løsner, faller den, spretter to ganger og blir liggende et øyeblikk. Så løfter den seg selv, dytter klaffen opp på vei ut (klaffen slår igjen med en fjær) og svever opp foran deg mens den snurrer og vugger seg på plass. | |
| 7 | **Hold** på boksen | Hold Mellomrom (Enter lader av seg selv) | **Logoens «+ ‖» fylles nedenfra som en batterimåler.** Hver del (de to strekene, stammen og armene i plusset) lander med et tikk og en puls. Lynårene vokser, ringen bak lyser opp, og boksen summer heller enn å dirre. Kameraet lener seg inn og litt rundt. Slipper du, hører du strømmen gå av, og nivået synker litt. Ved 100 % hopper boksen, det blinker, og fliken glinser: «DRA FLIKEN OPP». | Logoen *er* batteriet. |
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
Plakaten (stillbildet av åpningen) vises med en gang, med ≈ 72 kB totalt. three.js-delen og GLB-filene lastes rett etter, og 3D-scenen toner inn over plakaten når den er klar.

| Hva | Når | Størrelse |
|---|---|---|
| HTML, CSS, `lib/pant/main.js` og delbiter, font, plakat (`stills/start.webp`) | Første opptegning | ≈ 72 kB (≈ 57 kB) |
| `lib/pant/world-*.js` (three.js, tree-shaket) | Rett etter | 664 kB (170 kB) |
| `assets/pant/machine.glb` | Rett etter | 370 kB (95 kB) |
| `assets/can/battery-can.glb` | Rett etter | 2,26 MB (1,14 MB) |
| `assets/can/spray.webp`, `meter.webp`, `spray.json` | Rett etter | 465 kB |
| **Totalt med 3D** | | **≈ 3,8 MB (≈ 2,0 MB over nettet)**, mot ≈ 15–17 MB i den gamle film-versjonen |
| Lett reserve (redusert bevegelse eller ingen WebGL): første opptegning, `lite-*.js` og seks stillbilder | I stedet | ≈ 0,13 MB |


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
