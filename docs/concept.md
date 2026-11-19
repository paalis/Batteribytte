# Batteribytte: vurdering og konsepter

## 1. Kritisk vurdering av dagens side og tidligere versjoner

### Hvorfor føles det oppdelt?
Siden består av **tre visuelle verdener som ikke deler kamera, lys eller materiale**:

| Verden | Hvor | Utseende |
|---|---|---|
| AI-film (494 WebP-bilder) | Hele reisen og heltebildet | Fotografisk og mykt, med korn og komprimering. Varmt hovedlys og turkis kantlys, tåke foran boksen, svart kant på lokket, og etiketten er tolket av AI-en. |
| Sanntids-3D (three.js, GLB fra Blender) | Klimakset og finalen | Rent og skarpt, uten korn, dybdeskarphet eller tåke foran boksen. RoomEnvironment-refleksjoner og NeutralToneMapping, sølvfarget lokk, etiketten rullet ut fra fotoet. |
| Cycles-render | Delingsbildet | En tredje stil: AgX Punchy, volumtåke og 3D-tekst. |

**Konkrete sømmer:**
- **Overgangen ved «Åpne!»:**
  - Kanten på lokket går fra svart til sølv, og etiketten skifter litt i proporsjoner og metning.
  - Kornet forsvinner, og boksen får en annen lyskarakter.
  - Tåka som lå *foran* boksen i filmen, ligger nå *bak* 3D-boksen.

  Vi skjuler skiftet ved å dimme og gjøre filmen uskarp. Det fungerer, men det *er* et skifte, og man ser det.
- **Tre brukergrensesnitt-språk:**
  - et fortellerlag med tekst over filmen
  - et panel-lag med «Er du klar?», Ja/Nei, «Fullt ladet!» og knapper
  - et 3D-lag der man drar i boksen

  Hvert lag har sin egen logikk, og panelene kommer *oppå* scenen i stedet for å være *i* den.
- **Tempoet brytes:** 8 sekunder passiv scrolling, så ett trykk, så 1,9 sekunder show, så et panel. Opplevelsen veksler mellom å se på og å fylle ut et skjema.

### Interaksjonene: for få, og for like
I dag må du gjøre to ting for å komme gjennom:
1. Scrolle eller holde «Ja». Dette er egentlig samme interaksjon, og den er passiv: du spoler en film.
2. Trykke «Åpne!» eller sveipe.

Å dra i boksen til slutt er valgfritt, og «Nei» er en blindvei. Det er *én* virkelig overraskelse: når 3D tar over. Tilbakespolingen er pen, men det er film. Ingen interaksjoner bruker risting, tilt, dra-og-slipp eller presisjon.

### Tekst og paneler
- **Tekstlinjene** («Det starter med én dråpe» og de andre) beskriver det filmen allerede viser. De bremser og gjør reklamen til en lysbildeserie. **Kast.**
- **«Er du klar? Ja/Nei»** er et skjema, ikke en opplevelse. «Nei» fører ingen steder interessant. **Kast i denne formen.**
- **«Fullt ladet! Batteriet er byttet. Skål!»** er generisk. Delingsknappen er viktig, men bør være selve premien.
- **Hjelpetekstene** («Hold inne …», «Scroll videre – eller hold Ja») er nødvendige *fordi* interaksjonene ikke forklarer seg selv. Interaksjonene bør i stedet vise hva de vil.

### Nettvekt og ytelse
Målt i repoet:

| Hva | Når | Størrelse |
|---|---|---|
| HTML, CSS, app.js, journey.js | Første lasting | 72 kB |
| GSAP, ScrollTrigger og Lenis | Første lasting | 137 kB |
| Font, poster og produktfoto | Første lasting | 125 kB |
| **Første lasting totalt** | | **≈ 334 kB** (bra) |
| Bildesekvensen | Bakgrunn | **13 MB** på desktop, **11 MB** på telefon (494 bilder) |
| can3d.js, GLB og spray.webp | Ved 100 % | **3,4 MB** (647 kB + 2,26 MB + 464 kB) |
| **Totalt** | | **≈ 16,7 MB** på desktop, **≈ 14,7 MB** på telefon |

**På en treg telefon:**
- Grovpasset av filmen (rundt 120 bilder) må inn før scrolling ser bra ut. På 3G tar resten over ett minutt.
- 494 dekodede bilder i 540×960 tar rundt 2 MB hver i minnet. iOS kaster bufferen, og bildene må dekodes på nytt mens du scroller. Det gir hakking.
- Klimakset tegner scenen to ganger per bilde (vanlig visning og glød), og tegner i tillegg filmen under.
- 3D-filene lastes først ved 100 %. Er nettet tregt, får du filmversjonen, altså enda et utseende.

### Hva er verdt å ta med fra tidligere versjoner?
| Versjon (fra git-historikken) | Verdt å ta med |
|---|---|
| **v1** (SVG-boks) | **Logoens «+ ‖» er en batterimåler.** Battery-logoen *er* et batteri med pluss- og minuspol. Den beste merkevareideen i hele historikken. |
| **v2** (reklamefilm med tre bokser) | Lysstreifet over tre bokser, produktbilde i stil med en ekte reklame |
| **Ladestasjonen** (fotoboksen, cf290ca) | Hold for å lade med tilgjengelige alternativer, gnister, «Nei» som lar boksen sige sammen og slukker lyset, og bruset når du trykker på boksen |
| **3D-studioet** (scene3d.js, 292c4d8) | **Kameraspråk per steg** (makro, lavt skyv innover, kutt ved smellet, kran opp ved Nei), logoens streker som måler, og at boksen velter ved Nei |
| **AI-filmen** (journey2) | Den mest fotorealistiske tåka og væsken vi har. Men det er en egen verden. |
| **Scroll-tidslinjen** (98de5cd) | Én kilde for fremdrift, fjær-logikken, flimmer-fri spoling og robust reserve |
| **Blender-løypa** (tools/blender) | Boksen som GLB, lynårene, sprut og skum som materiale, og at alt kan rendres på nytt med skript |

### Behold / endre / kast
| Element | Vurdering | Begrunnelse |
|---|---|---|
| AI-filmen som reise (494 bilder) | **Kast** som bærende element | Den er hovedårsaken til at siden føles oppdelt og veier 11–13 MB. Du ser på den, du gjør ikke noe. Kan eventuelt leve videre som en liten, *diegetisk* reklamevideo inne i verdenen (se konsept B). |
| Scrolling som hovedinteraksjon | **Kast** | Passiv. Lenis og ScrollTrigger blir overflødige. |
| «Er du klar? Ja/Nei» | **Kast** | Et skjema. Erstattes av en handling i scenen. |
| Tekstlinjene | **Kast** | De forklarer det man ser. |
| «Fullt ladet!»-panelet | **Endre** | Premien skal være en delbar *gjenstand* (et kort eller en lapp), ikke et panel. |
| Blender-boksen (GLB) | **Behold og forbedre** | Riktig form, tapp, lyn, skum og animasjoner. Trenger ekte bakside og felles lyssetting med resten av scenen. |
| Blender-løypa (bpy-skriptene) | **Behold** | Hele verdenen bør bygges her, så film, render og sanntid får samme utseende. |
| Sprut, skum og lyn | **Behold** | Gode øyeblikk. Kan gjenbrukes i klimakset. |
| Bloom og liten etterbehandling | **Behold** | Men bare én tegning per bilde: alt i én scene, uten film under. |
| Logoen som batterimåler (v1, scene3d) | **Ta inn igjen** | Den sterkeste merkevareideen: boksen *er* batteriet. |
| Kameraspråk per steg (scene3d) | **Ta inn igjen** | Gir hvert trykk et nytt bilde, og dermed overraskelse. |
| Web Audio-lyd og haptikk | **Behold og utvid** | Billig og effektiv. Trenger en lydmiks med én felles lydstyrkeprofil. |
| Tilgjengelighetsmønstrene (tastatur, live-region, redusert bevegelse) | **Behold** | Gjelder for alle interaksjonene i det nye konseptet. |
| Delingsbildet (Cycles) | **Endre** | Rendres i samme verden og stil som siden. |

---

## 2. Tre konsepter

Alle tre bruker **én verden og én renderer**: sanntids-3D bygget i Blender. Filmen er ikke lenger bærende i noen av dem. Hvert steg har sin egen type interaksjon og sitt eget kamera, så hvert trykk gir et nytt bilde.

### Konsept A: «Bak dekselet» (telefonen er enheten)
**Idé:** Telefonen du holder har 1 % batteri. For å bytte batteri tar du av bakdekselet, og inni ligger det en Battery-boks i stedet for et batteri. Bokstavelig batteribytte, på din egen telefon.

| # | Interaksjon | Overraskelsen |
|---|---|---|
| 1 | **Dra ned** varselet «Lavt batteri, 1 %» | Hele skjermen faller bakover. Kameraet snur telefonen i 3D, og du ser baksiden. |
| 2 | **Skyv** bakdekselet av (dra sidelengs, med motstand) | Inni ligger en grå, bulket, flat Battery-boks i et batterirom. Logostrekene blinker rødt. |
| 3 | **Lirk ut** den flate boksen (dra opp med strikk-motstand til den løsner) | Den spretter ut og skrangler bort, med «klonk» og vibrasjon. |
| 4 | **Rist** telefonen (DeviceMotion; på desktop: tast rask eller dra fram og tilbake) | En fersk, dugget boks faller ned fra «himmelen» og lander i rommet. |
| 5 | **Trykk den på plass** (hold til den klikker) | Elektrisitet går gjennom telefonen. Logoen «+ ‖» fylles som batterimåler, og telefonen starter opp. |
| 6 | **Flikk** fliken opp | Smell, sprut og skum, og «skjermen» viser 100 %. |
| Deling | Låseskjerm-kort: «Batteribytte fullført, 100 %, kl. 14:32» | Ser ut som et skjermbilde fra en telefon, og er derfor lett å dele i chat. |

- **Batteribyttet:** helt bokstavelig.
- **Film, Blender og sanntid:** ingen film. Telefonmodell og bokser lages i Blender, alt kjører i sanntid, og stillbildene til reserveversjonen rendres i Blender.
- **Sømløst:** én kamerarigg gjennom hele opplevelsen. Skjermen på telefonen er en tekstur i samme scene.
- **Lyd og haptikk:** klikk, klonk og en oppstartslyd, med vibrasjon på hvert mekanisk steg.
- **Svakhet:** fungerer best på mobil. På desktop er det en «telefon på bordet». Det er også en etablert gimmick (telefonen som scene).

### Konsept B: «Pantemaskinen» ⭐ anbefalt
**Idé:** Batteribytte på norsk: **pant det flate batteriet, og få et fullt tilbake.** En nattlig pantemaskin i neonlys med skiltet «BATTERIBYTTE». Alle kolleger kjenner pantemaskinen og irritasjonen når den avviser boksen din, og det er der humoren ligger.

| # | Interaksjon | Overraskelsen |
|---|---|---|
| 0 | (Åpning) Mørkt, med summende lysrør. Maskinen våkner, og en flat, grå Battery-boks ligger foran deg. Logostrekene blinker rødt med ett felt igjen. | Stillbilde fra Blender med en gang, og 3D-scenen tar over sømløst. |
| 1 | **Dra** den flate boksen inn i det runde hullet | Maskinen suger den inn. Boksen spinner under røde laserstreker. |
| 2 | **Vri** boksen (dra sidelengs eller bruk piltastene) | **Avvist!** «Strekkoden vises ikke», og boksen rulles ut igjen. Du vrir den til strekkoden vender mot skanneren, og får et grønt pip. Den kjente frustrasjonen, brukt som humor. |
| 3 | (Belønning, uten interaksjon) **KNAS** | Boksen knuses i sakte film, med ristende skjerm og kraftig vibrasjon. Telleren hopper: «Batterier byttet i dag: 1». |
| 4 | **Trykk** på den store grønne knappen | Lappen skrives ut: «1 × BATTERI. Gyldig for én full lading.» Så begynner maskinen å buldre. |
| 5 | **Rist** (DeviceMotion; desktop og tastatur: mellomrom raskt) | Den nye boksen sitter fast, som i en brusautomat. Du rister den løs, og den dunker ned i luka. |
| 6 | **Hold** på boksen | Lading: logoens «+ ‖» fylles som batterimåler, lynårene vokser, lyden stiger og vibrasjonen bygger seg opp. |
| 7 | **Flikk** fliken opp | Smell, sprut og skum (dagens klimaks), mens kameraet trekker seg ut til et heltebilde av maskinen og den ferske boksen. |
| Deling | **Pantelappen er premien:** «Pantelapp · Batteribytte · 1 × Battery Fresh · kl. 14:32 · Din tur?» | Lages som bilde på siden og deles med Web Share, inkludert filen, eller lenken kopieres. Delingsbildet (OG) er lappen. |

- **Batteribyttet:** visuelt og kulturelt. Flatt inn, fullt ut. Boksen er batteriet, og logoen er måleren.
- **Film, Blender og sanntid:**
  - Maskinen, bokser, knusing (formnøkler), lapp, rom og lys bygges i Blender og kjøres i sanntid.
  - AI-filmen kan *gjenbrukes diegetisk* som en kort reklame på maskinens skjerm (en video som tekstur, 540p, rundt 1,5 MB, lastes sent). Da hører den til i verdenen i stedet for å være sin egen.
  - Stillbildene til reserveversjonen rendres i Cycles.
- **Sømløst:** samme rom gjennom hele opplevelsen. Kameraet beveger seg kontinuerlig mellom stasjonene (hull, skanner, knapp, luke, heltebilde) etter kameraspråket fra scene3d. Ingen paneler: all tekst er inne i scenen (maskinens display og lappen).
- **Lyd og haptikk:** suget, pipet og avvisningssummen, *knaset*, skriveren, buldringen, «dunk», lade-tonen og smellet, med vibrasjonsmønstre for hvert steg. Lyden slås på med det første trykket (draget i trinn 1), så den er naturlig på uten egen lydknapp. Lyd av og på ligger synlig i hjørnet.
- **Hvorfor B:**
  - **Mest overraskende og mest «vår».** Norsk pantekultur og avvisningsgaget gir latter. Ingen andre energidrikk-sider gjør dette.
  - **Sju ulike handlinger:** dra, vri, trykk, rist, hold og flikk, i tillegg til knaset.
  - **Delbarheten er innebygd:** pantelappen er en gjenstand man vil dele.
  - **Én verden,** så det oppdelte forsvinner.
  - **Rundt 70 % lettere enn i dag** (se tabellen under).
  - **Gjenbruker** Blender-løypa, boksen, lynet, spruten, skummet og gløden.

### Konsept C: «Én tagning» (videreføring av filmverdenen)
**Idé:** Behold stemningen fra AI-filmen (svart studio, tåke, lyn), men bygg den på nytt i Blender, så filmen kan erstattes av én sammenhengende kameratur i sanntid. Du styrer elementene.

| # | Interaksjon | Overraskelsen |
|---|---|---|
| 1 | **Tegn** et lyn med fingeren til boksen | Lynet slår ned der du tegnet, og boksen våkner. |
| 2 | **Hold** for å lade | Logostrekene fylles. Kameraet glir ned i væsken (dråpe og bobler som partikler). |
| 3 | **Tilt** telefonen (eller dra) | Du styrer lyset og tåka rundt boksen. Lysstreifet følger hånda di. |
| 4 | **Rist** | Boksen bruser og dugger, og iskrystaller vokser. |
| 5 | **Flikk** | Smell, sprut og skum. |
| 6 | **Skål**: dra boksen mot en kollegas boks | Klink, og et kort med «Skål, batteriet er byttet» til deling. |

- **Svakhet:** pent, men mer «reklamefilm du styrer» enn overraskende. Det minner mye om dagens side, og humoren og selve batteribyttet er svakere. Å bygge tåke og væske i sanntid er også krevende på telefon.

### Anbefaling: **B, Pantemaskinen**
B svarer best på alle kravene i oppdraget:
- overraskelse i hvert steg
- minst fem ulike interaksjoner
- sammenhengende, fordi alt er én verden uten film-sømmer
- delbart, med pantelappen som premie
- tydelig «batteribytte», og morsomt for norske kolleger

A er et godt alternativ hvis man ønsker noe enda mer mobilfokusert. C er det tryggeste, men også det minst overraskende.

---

## 3. Den manglende baksiden
- **Anbefaling:** ta **12–16 bilder rundt en ekte Battery Fresh-boks**:
  - på 50–60 cm avstand med 2× zoom
  - mykt lys uten speilinger
  - kamera i høyde med midten av boksen
  - ett bilde for hver 25–30°

  Jeg syr dem sammen til en 360°-etikett med metoden vi brukte på Monster-boksen. **I konsept B er dette nødvendig**, fordi avvisningsgaget bygger på strekkoden på baksiden.
- **Gjort:** 16 bilder av en ekte boks er sydd sammen til baksiden (`tools/blender/label_360.webp`, se `tools/blender/backlabel/`), med ingredienser, strekkode, pantemerke og den engelske teksten.

---

## 4. Nettvekt (estimat for konsept B)
| Hva | Når | Størrelse |
|---|---|---|
| HTML, CSS og logikk | Første lasting | ≈ 60 kB |
| Stillbilde av første scene (Cycles, WebP) og font | Første lasting | ≈ 110 kB |
| **Første opptegning** | | **≈ 170 kB** |
| three.js-bunten (bare det som brukes) | Bakgrunn, straks | ≈ 600 kB (≈ 160 kB gzip) |
| Scenen (maskin, rom, flat boks): GLB med meshopt og WebP-teksturer på 1K | Bakgrunn, straks | ≈ 1,2 MB |
| Den ferske boksen (dagens GLB, optimalisert) og sprut | Mens trinn 1–4 pågår | ≈ 1,3 MB og 0,46 MB |
| Reklamevideo på maskinens skjerm (valgfri) | Sent | ≈ 1,5 MB |
| **Totalt** | | **≈ 3,6 MB** (5,1 MB med video) mot ≈ 15–17 MB i dag |
| Lett reserve (ingen WebGL eller redusert bevegelse): 7 Cycles-stillbilder i ≈ 60 kB hver | I stedet | ≈ 0,4 MB |

**Første interaksjon er mulig etter ≈ 1,5 MB**, rundt 1–2 sekunder på 4G. Til da vises stillbildet, og interaksjonene står i kø. Store filer legges ikke i git utover det som allerede er der. Alt lages med skript og komprimeres med gltf-transform (meshopt og WebP). Den gamle bildesekvensen og mp4-filen fjernes fra siden hvis konseptet velges.

## 5. Krav, slik de løses
- **Mobil først (390×844) og 60 fps:**
  - én renderer og én scene
  - pikseltetthet høyst 1,5 på telefon
  - glød bare der det er energi
  - én tegning per bilde
  - kvaliteten trappes ned automatisk ved lav bildefrekvens
- **Tastatur:** hver handling har et alternativ.

  | Handling | Tastatur |
  |---|---|
  | Dra | Enter |
  | Vri | Piltaster |
  | Trykk | Mellomrom |
  | Rist | Mellomrom raskt eller R |
  | Hold | Hold Mellomrom |
  | Flikk | Pil opp |

  Én fokusert «handling»-knapp beskriver neste steg for skjermleseren, og en live-region forteller hva som skjer.
- **prefers-reduced-motion:** stillbildene vises ett og ett med de samme handlingene som knapper. Ingen kamerabevegelse og ingen risting. Lappen kan fortsatt deles.
- **Ingen WebGL, eller lasting som feiler:** samme lette reserve.

## 6. Arbeidsmåte etter valget
1. Implementer i grenen `claude/eager-brown-vw33es`, startet fra `main`, i små steg med én commit per stasjon.
2. Blender-skript for maskin, rom, flat boks, knusing og lapp, i samme stil som `tools/blender/build_can.py`. Reservebildene rendres med Cycles.
3. Sanntidsscenen skrives ny. `src/can3d.js` (bloom, spray, skum og show) og lyd- og tilgjengelighetsmønstrene fra `app.js` gjenbrukes der de passer.
4. Playwright på mobil (390×844) og desktop (1440×900), med skjermbilde av hvert trykk, tastaturløpet, redusert bevegelse og reserve uten WebGL. Showet testes i sakte film, med `performance.now` skalert til tidel fart.
5. Vercel-forhåndsvisning av grenen, med lenken hentet via Vercel MCP.
6. Oppdater `docs/interaction-spec.md`.
7. Du tester iPhone og lyd selv.
