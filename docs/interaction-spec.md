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
| 4 | | | **KNAS**: pressen kommer fort ned og stopper på boksen (et kort stillbilde i treffet). Deretter knuser den boksen i sakte film. Toppen av boksen følger pressen nøyaktig, veggen krøller seg i skrukker, og kameraet rykker inn. Telleren tikker fra n − 1 til n. Rullene glir fra hverandre, og den flate boksen faller ned mellom dem mens den tumler. Kameraet trekker seg ut av maskinen langs samme myke bane som på vei inn. Kammerlyset står foran pressen, bak kameraet, så pressen aldri får en glødeflekk på vei ned. | |
| 5 | **Trykk** på den grønne PANT-knappen | Enter | Knappen går inn under fingeren, lyser og blir inne til du slipper. Pantelappen glir ut av sporet i rykk, som fra en termoskriver: det er papiret som beveger seg, ikke trykket som klemmes. Så svaier den. Den nye boksen kommer rasende ned og kiler seg fast på skrå i luka, og maskinen rykker og kveles: «FEIL 0xBATT · BATTERIET SITTER FAST». | Den nye boksen sitter fast i luka. |
| 6 | **Rist** telefonen, eller dra fram og tilbake over skjermen | R eller Mellomrom flere ganger | Maskinen er tung og fjærende. Hvert rist dytter den i retningen du ristet, og den gynger tilbake. Boksen henger etter maskinen og løsner gradvis: den sklir, vipper og synker, mens en måler på skjermen fylles. Når den løsner, faller den ned i luka: lyset i luka hakker seg på, og gnister og støv spruter opp. Den spretter to ganger og lader seg så opp der den ligger: den knitrer, dirrer, og lyset pulserer. Så skytes den ut med en sjokkbølge og et gnistdryss. Klaffen kastes opp og smeller igjen på fjæren med et par klakk. Boksen svever opp foran deg med et gnistspor, snurrer én gang og lander i ringen med en lyspuls. | |
| 7 | **Hold** på boksen | Hold Mellomrom (Enter lader av seg selv) | **Logoens «+ ‖» fylles nedenfra som en batterimåler.** Hver del (de to strekene, stammen og armene i plusset) lander med et tikk og en puls. Lynårene vokser, ringen bak lyser opp, og boksen summer heller enn å dirre. Kameraet lener seg inn og litt rundt. Slipper du, hører du strømmen gå av, og nivået synker litt. Ved 100 % hopper boksen, det blinker, og fliken glinser: «DRA FLIKEN OPP». | Logoen *er* batteriet. |
| 8 | **Flikk** fliken opp (sveip opp, eller trykk på boksen) | Pil opp eller Enter | Fliken svarer før den gir etter: den løfter seg mot en stiv fjær mens du drar, og boksen lener seg bakover og dukker litt. Slipper du for tidlig, smekker den ned igjen med et klikk. Over streken kommer først et lite trykk (boksen klemmes, fliken graver seg inn), så smellet: boksen sparkes ned og fjærer tilbake, og kameraet går tett inn på åpningen. Det kommer blits, en gyllen fontene av dråper med tyngdekraft, en sky av dugg og en ring av lys, sprut i sakte film (Cycles-sprite), skum som renner ned, og lynene topper. Etterpå bobler det fra åpningen. Etter et drøyt sekund i nærbildet trekker kameraet seg ut til heltebildet mens boksen snurrer én runde, går litt forbi og legger seg i en rolig sveving. Bildet får stå et øyeblikk før lappen kommer. | |
| 9 | **Del** pantelappen, eller «Bytt igjen» | Tab, Enter | Bakgrunnen dempes, og pantelappen kommer inn som papir revet av sporet: ovenfra, rullet ut fra toppen, den svinger forbi og legger seg litt skjevt. Så kommer de to knappene opp etter hverandre. Lappen kan deles som bilde (Web Share med fil) eller som lenke, som kopieres. Med redusert bevegelse står alt der med en gang. | Premien er en gjenstand: «PANTELAPP · 1 × BATTERI, FLATT · PANTET · 1 × BATTERY FRESH · LADET · DIN TUR?» |

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
- **Lydene er opptak av reklamefilmkvalitet:** 27 lydeffekter fra ElevenLabs, valgt ved lytting (`tools/sfx/selection.json`, kreditering i `CREDITS.md` og «Lyd: ElevenLabs» under logoen).
- **Filformat:** De ligger i `assets/sfx/` som .ogg (Vorbis) og .m4a (AAC, for Safari og iPhone). Nettleseren henter bare ett av formatene.
- **Lasting:** Lyden låses opp ved første trykk, tast eller berøring. iOS får en stille buffer i samme gest. Filene hentes og dekodes rett etter, med lydene til første steg først.
- **Avspilling:**
  - Korte lyder spilles som AudioBuffer med litt tilfeldig tonehøyde (±3 %) og nivå (±1,5 dB) hver gang.
  - Loopene (`hum`, `room`, `rollers`, `rumble`, `charge`, `fizz`) går over sin nøyaktige lengde. Skjøten er bakt inn med 40 ms overtoning.
  - Ladelyden følger nivået: den går fortere og blir lysere og sterkere.
- **Miks i lag:**
  - Smellet er fliken, spruten og en dyp dunk, og så fresingen som dør ut over et par sekunder.
  - Knaset har en dyp dunk under seg.
  - Maskinsummingen har natten utenfor under seg.
- **Alt går gjennom én lett kompressor** (−14 dB, 3:1).
- **Reserve:** Hver lyd beholder den gamle syntesen (oscillator og støy). Den spiller til filen er lastet, eller hvis filen ikke kan lastes. En loop som går på syntese, bytter over til filen når den kommer.
- **Lyd av og på:** Lyden er på som standard, og «Lyd» (eller M) slår den av. Knappene gir et dempet klikk.
- **Vibrasjon** (`navigator.vibrate`, bare Android) på hvert mekanisk steg.
- **Risting med telefonen** bruker `devicemotion`. iOS ber om tillatelse ved første trykk.
- **Verktøyene** bak utvalget ligger i `tools/sfx/`: søk, generering, måling, poeng, lytteside og `prepare.py`, som kutter, normaliserer og koder. Vurderingen står i `docs/sound-review.md`.

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
| `assets/sfx/*.ogg` (eller `*.m4a` i Safari), 27 lyder | Etter første trykk | 538 kB (Safari: 414 kB) |
| **Totalt med 3D** | | **≈ 4,3 MB (≈ 2,5 MB over nettet), med lyd**, mot ≈ 15–17 MB i den gamle film-versjonen |
| Lett reserve (redusert bevegelse eller ingen WebGL): første opptegning, `lite-*.js` og seks stillbilder | I stedet | ≈ 0,13 MB |


## Filer
- **`index.html`, `style.css`:** siden. **`lib/pant/`:** bygget med `tools/build-pant.sh` fra `src/pant/`.
  - `main.js` velger 3D eller reserve og styrer ord, taster og lapp.
  - `world.js` er three.js-scenen og historien.
  - `lite.js`, `sound.js`, `receipt.js` og `bloom.js`.
- **Blender** (`tools/blender/`, Blender som Python-modul: `pip install bpy==5.3.0 pillow`):
  - `build_machine.py` → `assets/pant/machine.glb` (maskin og rom)
  - `build_can.py` → `assets/can/battery-can.glb` (boksen: etikett, baksiden sydd sammen fra bilder av en ekte boks i `tools/blender/label_360.webp` (se `tools/blender/backlabel/`), lyn, tapp og skum) og `assets/pant/meter.webp` (logoen som måler)
  - `render_spray.py` → `assets/can/spray.webp`
  - `render_stills.py` → `assets/pant/stills/`
