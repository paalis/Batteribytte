# Batteribytte — interaksjonsspesifikasjon

Mål: et morsomt varsel til kolleger om at det er tid for å kjøpe energidrikk. Siden er en ladestasjon du
bruker selv, ikke en film du ser på. Alt som beveger seg har en årsak: ditt trykk, pekeren din, eller
batterinivået.

Grunnlag: `interaction-design` (Norman, Tognazzini, Nielsens responstider), `ui-ux-pro-max` (stil «Dark Mode
(OLED)»: dypt svart, sparsom glød, synlig fokus, redusert bevegelse; tegnvis inngang på kort overskrift) og
`find-animation-opportunities` (porten frekvens → formål → fart → funksjon, felles kurver).

Filmversjonen ligger på `/film/` til sammenligning.

## 3D-studioet (scene3d.js)

Mellom trykkene er siden et ekte 3D-studio i sanntid (Three.js, samme studio som filmen i `film-src/`):
boksen er dreid etter fotoets egen silhuett, fotoet er etiketten (baksiden i boksens egne farger), med kondens,
metallisk lokk og kant, blankt gulv med speiling, lav røyk og bloom. Logoens to stolper er batterimåleren.

| Steg | Kamera (video-director) | Hva skjer |
|---|---|---|
| Åpning | Makro på kondensen, et lys glir over, trekker ut til helten | Overskriften kommer tegn for tegn |
| Venter | Står nesten stille (rolig drift, følger pekeren) | Dra for å snu boksen, trykk for å la den bruse |
| Lader | Kjører inn lavt og rundt boksen | Gnister trekkes opp i spiral, lyset blir varmt, boksen dirrer |
| Pop | Push + flash: klipp til lav heltevinkel | Blits, sjokkring på gulvet, gnister og dråper, flippen åpnes |
| Fullt ladet | Langsom bane rundt boksen | Etterglød |
| Nei | Kran opp og bort | Studiolyset slukkes, boksen velter |

Uten WebGL, eller hvis noe feiler, blir fotoversjonen stående. Bildefrekvensen overvåkes: på trege telefoner
senkes pikseltetthet og så bloom.

## «Reisen»: ladescenen (journey.js)

AI-filmen `assets/journey2-720.mp4` (eller `-540` ved datasparing, treg forbindelse eller telefon med lite minne)
er ladescenen. Alle bilder er nøkkelbilder, så skrubbing med `currentTime` går jevnt begge veier.

| Tid i filmen | Innhold | Nivå |
|---|---|---|
| 0–2,5 s | makro av lokket med en dråpe | 6 % → |
| 2,5–5,9 s | gjennom dråpen, isbit, rosa væske med bobler | |
| 5,9–9 s | flere bobler, overflaten brytes ca. 8 s (riseren starter, c ≈ 0,4) | |
| 9–12,5 s | teal tåke og lynbuer | |
| 12,5–15,4 s | tåken tynnes, boksen kommer fram | |
| 16,5 s | `T_POP`: ladingen ender her | 100 % |
| 16,65 / 16,85 s | tappen løftes / spruten (smell, blits og 2D-sprut) | spilles |
| 18,4 s | «Fullt ladet!» kommer inn | |
| 20,6 s | sluttbildet blir stående | |

- **Lading tar 8 s** (`RATE = 94/8`). Ved hold er tiden c × `T_POP`, glattet med en kritisk dempet fjær. `currentTime` settes bare når avviket er over 1/48 s.
- **Slipper man**, synker nivået og filmen spoler tilbake. Helt ned til 6 % eller «Lad igjen» gir tilbake til 3D.
- **Overgangen** er 200 ms med kort blits, og 3D blir uskarpt og tones ut. 3D-renderingen står på pause mens filmen vises.
- **Reserve:** er ikke filmen bufret 5 s når ladingen starter, går den ladingen i 3D som før. Nei bruker alltid 3D.
- **Lasting:** filmen lastes etter første opptegning når nettleseren er ledig, og primes på første trykk for iOS.
- **Redusert bevegelse:** ingen film, og den lastes heller ikke.
- **Lyd:** summingen stiger med c, en riser kommer fra c ≈ 0,4 til 100 %, og smellet ved pop. Alt er av til «Lyd» trykkes.

## Flyt

```
Åpne siden (batteri 6 %, blinker rødt)
   └─ «Er du klar?»
        ├─ Ja: hold inne → lader 6→100 % på 8 s («reisen» skrubbes; i 3D-reserven: gnister, glød, risting, summing)
        │      slipp for tidlig → nivået synker tilbake, «Hold inne til 100 %»
        │      trykk kort / Enter / J → lader av seg selv
        │      100 % → pop (blits, ring, gnister og dråper, boksen hopper) → «Fullt ladet!»
        │                → Varsle kollegaene (deling / kopier lenke) · Lad igjen
        └─ Nei / N → tømmes til 0 % på 1,1 s, lyset går, boksen synker sammen → «Lavt batteri…» → Prøv igjen
Boksen: følger pekeren (vipper), bruser når du trykker på den.
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
