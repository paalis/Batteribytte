# Batteribytte — interaksjonsspesifikasjon

Mål: et morsomt varsel til kolleger om at det er tid for å kjøpe energidrikk. Siden skal føles levende,
men alt som skjer på skjermen skal ha en ekte årsak (filmen, et trykk, en lading) — ingen pynt uten mening.
Grunnlag: skillen `interaction-design` (Norman, Tognazzini, Nielsens responstider).

## Revisjon av forrige versjon

| Funn | Prinsipp | Konsekvens | Tiltak |
|---|---|---|---|
| Ingenting skjer mens filmen laster (3–4 MB) | Visibility, Latency (>1 s) | På tregt nett: stillbilde uten forklaring | Lasteindikator etter 400 ms med prosent; etter 8 s rett til spørsmålet med forklaring |
| 9 s intro uten fremdrift | Attention limit (1–10 s) | Brukeren vet ikke hvor lenge det varer | Tynn fremdriftslinje + «Hopp over» |
| Svarklippet (2 s) uten tekst | Feedback | Etter trykket forsvinner alt i 2 s | Live batterimåler i UI som følger boksens måler i filmen |
| Resultatet kommer først når klippet er ferdig | Feedback timing | Teksten kommer etter at «smellet» har skjedd | Resultatet lander på smellet (Ja 10,3 s) / når lyset er borte (Nei) |
| Lydknappen bytter mellom handling («Slå på lyd») og tilstand («Lyd: på») | Consistency | Uklart hva et trykk gjør | Fast navn «Lyd», tilstand vist med ikon og `aria-pressed` |
| Ingen neste handling etter «Ja» | Anticipation | Sidens formål (varsle kolleger) stopper opp | «Varsle kollegaene»: delingsark, ellers kopier lenke med bekreftelse |
| Paneler bytter uten overgang | Motion = kommunikasjon | Tekst «hopper» inn | 250 ms ease-out inn, ingen ventetid før man kan trykke |
| Ingen trykktilstand | Component states (active) | Svakere følelse av at trykket ble tatt imot | `:active` 100 ms skala på knapper |
| Filmfeil faller stille tilbake | Error recovery | Brukeren skjønner ikke hvorfor det ikke spiller | Kort beskjed: hva, hvorfor, hva nå |
| Kun mus/touch | Efficiency of the user | — | Tastatur: J = Ja, N = Nei, Esc = hopp over, M = lyd |

## Flyt

```
Åpne siden → [laster] ──(>8 s / feil)──→ Spørsmål (med beskjed)
     ↓ klar
Intro 0–9 s (fremdrift, Hopp over/Esc) ──→ Spørsmål «Er du klar?»
                                             ├─ Ja (J)  → lading 9–11 s, måler 6→100 % → «Fullt ladet!»  → Varsle kollegaene · Se igjen
                                             └─ Nei (N) → tapping 11–13 s, måler 6→0 %  → «Lavt batteri…» → Prøv igjen (→ Spørsmål)
```

## Tilstander

| Element | Standard | Hover | Fokus | Trykket | Låst | Lasting/fremdrift |
|---|---|---|---|---|---|---|
| Ja / Nei | Pille, avkrysningsboks | Lysere bakgrunn | 3 px hvit ring | Skala .96, hake tegnes | Valgt: hake; annen: 30 % | Måler i panelet |
| Lyd | Ikon + «Lyd», av | Lysere | Ring | Skala .96 | — | — |
| Hopp over | Synlig under intro | Lysere | Ring | Skala .96 | Skjult utenfor intro | Fremdriftslinje |
| Varsle kollegaene | Gull pille | Lysere | Ring | Skala .96 | — | «Lenke kopiert» i 2,5 s |

## Bevegelse

| Hva | Varighet | Kurve | Redusert bevegelse |
|---|---|---|---|
| Trykk på knapp | 100 ms | ease-out | ingen skala |
| Panel inn | 250 ms | ease-out | vises direkte |
| Fremdriftslinje | følger filmen | lineær | skjult (ingen film) |
| Batterimåler | følger filmens kurve | samme som filmen | hopper til sluttverdi |
