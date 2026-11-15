# Batteribytte — interaksjonsspesifikasjon

Mål: et morsomt varsel til kolleger om at det er tid for å kjøpe energidrikk. Siden er en ladestasjon du
bruker selv, ikke en film du ser på. Alt som beveger seg har en årsak: ditt trykk, pekeren din, eller
batterinivået.

Grunnlag: `interaction-design` (Norman, Tognazzini, Nielsens responstider), `ui-ux-pro-max` (stil «Dark Mode
(OLED)»: dypt svart, sparsom glød, synlig fokus, redusert bevegelse; tegnvis inngang på kort overskrift) og
`find-animation-opportunities` (porten frekvens → formål → fart → funksjon, felles kurver).

Filmversjonen ligger på `/film/` til sammenligning.

## Flyt

```
Åpne siden (batteri 6 %, blinker rødt)
   └─ «Er du klar?»
        ├─ Ja: hold inne → lader 6→100 % på 1,5 s (gnister fra gulvet, glød, risting, summing)
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
