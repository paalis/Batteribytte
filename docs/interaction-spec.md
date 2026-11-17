# Batteribytte — interaksjonsspesifikasjon

Mål: et morsomt varsel til kolleger om at det er tid for å kjøpe energidrikk. Siden er en ladestasjon du
bruker selv, ikke en film du ser på. Alt som beveger seg har en årsak: ditt trykk, pekeren din, eller
batterinivået.

Grunnlag: `interaction-design` (Norman, Tognazzini, Nielsens responstider), `ui-ux-pro-max` (stil «Dark Mode
(OLED)»: dypt svart, sparsom glød, synlig fokus, redusert bevegelse; tegnvis inngang på kort overskrift) og
`find-animation-opportunities` (porten frekvens → formål → fart → funksjon, felles kurver).

Dette er den eneste versjonen av siden: `/film/` og `/v1/` sendes videre til forsiden.

## Filmen er basen (journey.js)

AI-filmen `assets/journey2-720.mp4` (eller `-540` ved datasparing, treg forbindelse eller telefon med lite minne)
er bakgrunnen på hele siden, ikke bare ladescenen. Alle bilder er nøkkelbilder, så skrubbing med `currentTime` går jevnt begge veier.
Én kritisk dempet fjær styrer filmens tid mot der tilstanden vil ha den, så alle «klipp» er bevegelser.

- **Første opptegning:** `assets/base-poster.jpg` (heltebildet, 16,1 s) står der med en gang; videoen fader inn over når den er lastet.
- **Er du klar? / Nei:** boksen står i tåka og filmen puster rolig mellom 15,75 og 16,46 s. Med mus følger bildet pekeren, på touch driver det sakte innover. Nei dimmer og tømmer batteriet.
- **Ja:** filmen spoler tilbake til makroen av lokket i én «whoosh» (uskarp, lysere, blits), og så skrubbes den av måleren.
- **Lad igjen / slipper man helt ned:** den spoler fram til boksen i tåka igjen.
- **Bred skjerm:** filmen beholder sin egen form til høyre, med myke kanter.

| Tid i filmen | Innhold | Nivå |
|---|---|---|
| 0–2,5 s | makro av lokket med en dråpe | 6 % → |
| 2,5–5,9 s | gjennom dråpen, isbit, rosa væske med bobler | |
| 5,9–9 s | flere bobler, overflaten brytes ca. 8 s (riseren starter, c ≈ 0,4) | |
| 9–12,5 s | teal tåke og lynbuer | |
| 12,5–15,4 s | tåken tynnes, boksen kommer fram | |
| 15,75–16,5 s | `T_POP`: ved 100 % venter boksen i tåka (filmen puster rolig fram og tilbake). Ja blir «Åpne!» | 100 % |
| | **Du åpner selv:** trykk «Åpne!», sveip opp, eller J / Enter / Mellomrom | |
| 16,65 / 16,85 s | tappen løftes / spruten (smell og vibrasjon; ingen 2D-effekter oppå filmen) | spilles |
| 20,6 s | sluttbildet blir stående, og «Fullt ladet!» kommer inn | |

- **Lading tar 8 s** (`RATE = 94/8`). Ved hold er tiden c × `T_POP`, glattet med en kritisk dempet fjær. `currentTime` settes bare når avviket er over 1/48 s.
- **Slipper man**, synker nivået og filmen spoler tilbake. Helt ned til 6 % spoler den fram til boksen i tåka.
- **Lading bruker alltid filmen:** er den ikke lastet når man trykker Ja, venter måleren på 6 % med «Laster filmen …» til første bilde vises. Bare hvis filmen ikke kan lastes i det hele tatt (feil, eller ingenting etter 20 s), lades det med fotoboksen (gnister, glød, risting), som også er reserven ellers.
- **Lasting:** filmen lastes etter første opptegning når nettleseren er ledig, og primes på første trykk for iOS.
- **Redusert bevegelse:** ingen film, og den lastes heller ikke. Fotoboksen vises.
- **Lyd:** summingen stiger med c, en riser kommer fra c ≈ 0,4 til 100 %, og smellet ved pop. Alt er av til «Lyd» trykkes.

## Flyt

```
Åpne siden (batteri 6 %, blinker rødt, filmen puster i bakgrunnen)
   └─ «Er du klar?»
        ├─ Ja: hold inne → lader 6→100 % på 8 s (filmen spoler tilbake og skrubbes; i fotoreserven: gnister, glød, risting, summing)
        │      slipp for tidlig → nivået synker tilbake, «Hold inne til 100 %»
        │      trykk kort / Enter / J → lader av seg selv
        │      100 % → pop (blits, ring, gnister og dråper, boksen hopper) → «Fullt ladet!»
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
