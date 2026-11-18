# Batteribytte — interaksjonsspesifikasjon

Mål: et morsomt varsel til kolleger om at det er tid for å kjøpe energidrikk. Siden er en ladestasjon du
bruker selv, ikke en film du ser på. Alt som beveger seg har en årsak: ditt trykk, pekeren din, eller
batterinivået.

Grunnlag: `interaction-design` (Norman, Tognazzini, Nielsens responstider), `ui-ux-pro-max` (stil «Dark Mode
(OLED)»: dypt svart, sparsom glød, synlig fokus, redusert bevegelse; tegnvis inngang på kort overskrift) og
`find-animation-opportunities` (porten frekvens → formål → fart → funksjon, felles kurver).

Dette er den eneste versjonen av siden: `/film/` og `/v1/` sendes videre til forsiden.

## Én tidslinje: scrolling er ladingen (journey.js)

Alt som beveger seg leser én verdi, fremdriften `p` (0–1). Scrolling flytter den (Lenis gir myk treghet, GSAP
ScrollTrigger kobler scrollen til hovedtidslinjen), «Ja» flytter den (å holde inne scroller siden for deg), og
tastaturet flytter den. Filmen, batteriet, tekstene, lyset på «Ja», bloom-lyset og lyden leses av samme `p` i samme bilde.

- **Filmen er en bildesekvens**, ikke video: `frames/720` eller `frames/540` (telefon, datasparing, treg linje), 494 bilder
  på 24 fps, tegnet på canvas. Hvert bilde er nøyaktig begge veier i alle nettlesere. Mellom to bilder blandes det neste inn,
  så sakte scrolling glir. Bildene lastes grovt først (hvert 32., så hvert 8.), så hele filmen kan skrubbes tidlig.
- **Lasting er den første ladingen:** batteriet fyller seg 0 → 6 % mens første runde med bilder kommer inn («Lader inn filmen …»).
- **Fart er uskarphet:** filmtiden følger `p` med en kritisk dempet fjær (løst eksakt, stabil på alle bildefrekvenser).
  Jo raskere tiden går, jo mer uskarpt og lyst blir bildet. Spolingen tilbake til makroen blir dermed en «whoosh» av seg selv.
- **Bred skjerm:** filmen beholder sin egen form til høyre, med myke kanter. Tekstene står til venstre.

| p | Filmen | Batteri | Tekst |
|---|---|---|---|
| 0 | boksen i tåka, puster mellom 15,75 og 16,46 s (pekeren flytter bildet) | 6 % | «Det er tid for Batteribytte!», «Er du klar?», scroll-hint |
| 0–0,06 | spoler tilbake til makroen av lokket (uskarp, blits) | | overskriften løftes bort |
| 0,06–1 | 0 → 16,5 s skrubbes av scrollen | 6 → 100 % | fem linjer som følger filmen (dråpe, bobler, trykk, strøm, nesten full) |
| 1 | `T_POP`: boksen venter, «Ja» blir «Åpne!» | 100 % | «Scroll videre / sveip opp – eller trykk Åpne!» |

- **Du åpner selv:** en ny scroll nedover (ikke farten fra scrollen som brakte deg dit), sveip opp, «Åpne!», J, Enter eller Mellomrom.
- **Klimakset er levende 3D** (`lib/can3d.js`): filmen blir stående på den lukkede boksen, og Blender-boksen
  (`assets/can/battery-can.glb`) legger seg nøyaktig over den. Så, på 1,9 s:
  1. **0–0,6 s, ladingen:** lynårene (bakt i Blender, `energy`) blusser opp og flimrer stadig raskere, boksen dirrer, gløden rundt vokser.
  2. **0,6 s, åpningen:** tappen smeller opp (modellens egen animasjon «open»), spruten skyter opp i sakte film
     (`assets/can/spray.webp`: en partikkelsprut rendret med Cycles fra nøyaktig dette kameraet). Ved 0,9 s: blits, smell og vibrasjon.
  3. **Etterpå:** filmen trer tilbake (mørkere, uskarp), energien dør ut til et svakt flimmer, og boksen tar én heltesving
     med et lysstreif over etiketten. «Fullt ladet!» kommer inn ved 1,9 s mens svingen går. Så kan du dra og snu boksen selv.
  Er 3D-boksen ikke klar (den lastes når batteriet er fullt), spilles filmen til siste bilde som før, og boksen trer ut etterpå.
- **3D-boksen og effektene lages i Blender** (Blender 5.3 som Python-modul, `pip install bpy`): `tools/blender/build_can.py`
  (modellen: 500 ml-form, etiketten fra produktfotoet, kondensdråper, lynårer, tapp på hengsel), `render_spray.py` (spruten)
  og `render_og.py` (delingsbildet `assets/og.jpg`: den ladede boksen med frosset sprut, tåke og tittelen).
- **Hold Ja:** scroller mot slutten på 8 s for hele veien. Slipper du for tidlig, faller den tilbake (2,4 s for hele veien).
  Kort trykk, Enter eller J lader av seg selv. Scroller du selv underveis, tar du over.
- **Scroll tilbake** fra «Åpne!» gjør den til «Ja» igjen. Helt til toppen er spørsmålet tilbake.
- **Nei** låser scrollen, tømmer batteriet og slukker lyset. «Prøv igjen» låser opp.
- **Lad igjen:** scrollen går til toppen, og filmen spoler fram til boksen i tåka igjen.
- **Overganger mellom panelene** bruker View Transitions der nettleseren har det (det gamle synker, det nye stiger fram), ellers CSS.
- **Reserve:** med redusert bevegelse, eller hvis bibliotekene eller bildene ikke kan lastes (ingen heltebilde etter 20 s),
  er siden én skjerm uten scroll, og fotoboksen lades med knappen (gnister, glød, risting).
- **Lyd:** summingen stiger med `p`, en riser kommer fra `p` ≈ 0,4 til 100 %, og smellet ved åpning. Alt er av til «Lyd» trykkes.

## Flyt

```
Åpne siden (batteriet fylles 0→6 % mens filmen lastes, blinker rødt, filmen puster i bakgrunnen)
   └─ «Er du klar?»
        ├─ Scroll ned → lader 6→100 % (filmen spoler tilbake og skrubbes av scrollen, tekstene følger filmen)
        ├─ Ja: hold inne → scroller for deg, 6→100 % på 8 s (i fotoreserven: gnister, glød, risting, summing)
        │      slipp for tidlig → nivået synker tilbake, «Hold inne til 100 %»
        │      trykk kort / Enter / J → lader av seg selv
        │      100 % → «Åpne!» → filmen spilles til slutt → 3D-boksen → «Fullt ladet!»
        │              (fotoreserven: pop med blits, ring, gnister og dråper, boksen hopper)
        │                → Varsle kollegaene (deling / kopier lenke) · Lad igjen
        └─ Nei / N → tømmes til 0 % på 1,1 s, lyset går → «Lavt batteri…» → Prøv igjen
Med film: bildet følger pekeren. Uten film (reserve): boksen vipper mot pekeren og bruser når du trykker på den.
```

## Tilstander

| Element | Standard | Hover (kun mus) | Fokus | Trykket | Låst | Fremdrift |
|---|---|---|---|---|---|---|
| Ja | Gull pille | Lysere gull | 3 px hvit ring | Skala .97, glød | Under lading | Lys fyll sveiper over knappen |
| Nei | Hvit kant | Lys bakgrunn | Ring | Skala .97 | 30 % under lading | — |
| Lyd | Ikon + «Lyd», av | Lysere | Ring | Skala .97 | — | — |
| Batteri (HUD) | Rødt under 20 %, blinker | — | — | — | — | Fyll og prosent følger nivået |

## Bevegelse (kurver: `--ease-out` 0.23,1,0.32,1 · `--ease-expo` 0.16,1,0.3,1)

| Hva | Formål | Frekvens | Varighet | Redusert bevegelse |
|---|---|---|---|---|
| Trykk på knapp | Tilbakemelding | Hver gang | 160 ms ease-out | ingen skala |
| Lading (fyll, glød, risting, gnister) | Tydelig tilstand | Én gang per besøk | Følger nivået | bare fyll og tall |
| Pop ved 100 % | Glede | Én gang per besøk | 550–750 ms | hopper rett til resultat |
| Nei: lys ut, boksen synker | Tydelig tilstand | Én gang per besøk | 1,1 s ease-in | bare dimming |
| Overskrift tegn for tegn | Glede | Ved åpning | 600 ms, 18 ms forsinkelse per tegn | vises direkte |
| Panel inn | Unngå brå endring | Per steg | 250 ms ease-out | vises direkte |
| Toast ut | Romlig sammenheng | Av og til | 150 ms ease-in, samme vei som inn | toning |
| Boksen vipper etter pekeren | Direkte manipulasjon | Kontinuerlig | Fjær | av |

Forkastet: animasjon på lydknappen (hyppig, tastatur), sprett i resultatteksten (popen eier feiringen),
pulserende «Hopp over» (finnes ikke lenger).

## Tilgjengelighet

- Hold-for-å-lade har alltid et alternativ: kort trykk, Enter eller J lader av seg selv (WCAG 2.5.1/2.5.7).
- Mellomrom kan holdes på fokusert «Ja».
- Batteriet er `role="meter"` med verdi i tiere. Start og resultat leses opp i en `aria-live`-region.
- Fokus flyttes til neste handling etter hvert resultat.
- Uten JavaScript vises spørsmålet og bildet av boksen.
