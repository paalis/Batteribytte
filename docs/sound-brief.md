# Batteribytte: lydbrief

Alle lydene lages i dag syntetisk i nettleseren (oscillator og støy i `src/pant/sound.js`). De skal byttes med ekte opptak som låter rikt og fysisk, som i en reklamefilm, ikke som 8-bit. De syntetiske lydene blir liggende som reserve hvis en fil ikke lastes.

**Merk:** Oppgaven nevner `app.js` (tilstandene ask, charging, yes, draining og no, hendelsene `charge`, `pop`, `no` og `ask`, og `BB.level`) og `lib/can3d.js`. Begge forsvant da konsept B («Pantemaskinen») erstattet filmsiden. Listen under bygger derfor på den faktiske koden:
- `src/pant/world.js` trigger lydene.
- `src/pant/sound.js` lager dem.
- `src/pant/lite.js` (den lette versjonen) bruker hum, suck, accept, click, thud, full og pop.

Slik passer utgangspunktet i oppgaven med koden:

| Oppgavens liste | Her |
|---|---|
| 1 Åpne / tab-pop | `pop` |
| 2 Fiss | `fizz` (i dag en del av `pop`) |
| 3 Skum / spray | `spray` (i dag en del av `pop`) |
| 4 Lading som følger `BB.level` | `charge` (følger `level` i hold-steget) |
| 5 Fullt ladet-stinger | `full` |
| 6 Drenering («Nei») | `powerDown`. Det finnes ikke noe «Nei» lenger, men nivået synker når du slipper. |
| 7 Atmosfære | `hum` (maskinen og neonlyset) og eventuelt `room` |
| 8 UI-trykk | `ui` (lyd på handlingsknappen finnes ikke i dag; foreslått, dempet) |

## Lydliste

**Type:**
- **E** = kort klipp (AudioBuffer)
- **L** = loop (sømløs)

**Prioritet:**
- **1** = det som høres mest eller betyr mest for «reklamefilm»-følelsen
- **3** = små detaljer der syntetisk lyd kan holde

| # | id | Type | Lengde | Når den trigges (`world.js`) | Hva vi ser etter | Prio | Søkefraser (engelsk) |
|---|---|---|---|---|---|---|---|
| 1 | `pop` | E | 0,3–1 s | Flikk (steg 8): fliken går opp, `popAndFinale` | Metallisk «tsst-klikk» fra en aluminiumsboks: klikket i fliken og trykket som slipper. Tørt og nært. | 1 | soda can open; can opening pop tab; aluminium can open close up; beer can crack open; energy drink can open |
| 2 | `fizz` | L | 2–4 s | Rett etter `pop`, tones ut over finalen | Kullsyre som bobler og knitrer i boksen, tett og fin, uten tydelige enkelthendelser (loopbar) | 1 | soda fizz; carbonation bubbles; fizzy drink bubbles close; soda can fizzing; sparkling water fizz |
| 3 | `spray` | E | 0,5–2 s | Samtidig med `pop` (sprutet i sakte film) | Skumutbrudd: et vått «pssssjjj» med sprut | 1 | soda spray burst; shaken soda can open spray; champagne spray foam; beer foam overflow; fizz burst |
| 4 | `charge` | L | 2–6 s, ett eller flere lag | Hold (steg 7), hele tiden mens du holder. Tonehøyde og filter følger `level` (0–1). | Stigende elektrisk summing og spenning, gjerne et lavt og et høyt lag som mikses etter nivå | 1 | electric charge up; power up hum loop; energy charging; electricity buzz loop; tesla coil hum |
| 5 | `full` | E | 0,4–1,5 s | 100 % (steg 7) | Kort og tilfredsstillende «ding» med «zap» | 1 | power up complete; electric zap ding; charged success; energy stinger; level up zap |
| 6 | `powerDown` | E | 0,3–1 s | Hold: når du slipper før 100 % | Nedadgående, deflaterende strøm som går av | 2 | power down; electricity power off; machine power down; spin down; shut down whine |
| 7 | `hum` | L | 3–10 s | Fra åpningen og hele veien (maskinen) | Kjøleskap, automat eller neon som summer, lavt og varmt, uten tydelige hendelser | 1 | vending machine hum loop; fluorescent light buzz; neon sign buzz; refrigerator hum; electrical hum room tone |
| 8 | `crush` | E | 0,5–1,5 s | KNAS (steg 4) | En aluminiumsboks som knuses av en presse: smell, krøll, knitring | 1 | aluminum can crush; can crushed; crushing soda can; metal can crunch; can crusher |
| 9 | `reject` | E | 0,3–1 s | AVVIST (steg 2) | Pantemaskinens kjente avvisningslyd: lav, irriterende summer | 1 | error buzzer; wrong buzzer; denied buzzer; reject beep; access denied buzz |
| 10 | `accept` | E | 0,2–0,8 s | GODKJENT (steg 3), og i den lette versjonen | Kort, ren tototone eller pling | 2 | success beep; confirmation chime; positive notification; approved beep; correct answer ding |
| 11 | `scanBeep` | E | 0,05–0,2 s | Laseren sveiper, og pip ved rulling (steg 2–3) | Kort pip fra en strekkodeleser (tonehøyden justeres i koden) | 2 | barcode scanner beep; supermarket scanner beep; scanner beep; checkout beep |
| 12 | `suck` | E | 0,5–1 s | Boksen slippes nær hullet og suges inn (steg 1) | Pneumatisk sug, luft som trekkes inn | 1 | vacuum suction; pneumatic suck; air suction whoosh; tube suction; vacuum intake |
| 13 | `gulp` | E | 0,3–0,8 s | Ringen «svelger» boksen (steg 1) | Dypt metallisk dunk inni maskinen | 2 | can drop into machine; metal thunk inside; vending machine drop; hollow metal thud; can falling in chute |
| 14 | `rollers` | L | 1–4 s | Skanning: boksen spinner på rullene (steg 2) | Liten elektrisk motor og ruller som går | 2 | small electric motor loop; conveyor rollers; motor whir loop; rotating mechanism; servo motor |
| 15 | `lock` | E | 0,1–0,4 s | Boksen låser seg med strekkoden opp (steg 3) | Magnetisk smekk eller lås | 2 | magnetic snap; latch click; mechanical lock click; magnet clack; snap into place |
| 16 | `click` | E | 0,05–0,3 s | PANT-knappen (steg 5), og når fliken slippes for tidlig | Stor, solid knapp med fysisk klikk | 2 | arcade button press; big button click; mechanical button; push button click; switch press |
| 17 | `printer` | E/L | 1–2 s | Pantelappen skrives ut (steg 5) | Termisk kvitteringsskriver, gjerne med avriving | 1 | receipt printer; thermal printer; pos printer; receipt printing tear; ticket printer |
| 18 | `rumble` | L | 2–5 s | Maskinen kveles når boksen sitter fast (steg 5–6) | Motor som sliter, bulder og risting | 2 | machine malfunction; motor struggling; jammed machine; engine sputter rumble; vending machine stuck |
| 19 | `rattle` | E | 0,2–0,6 s | Hvert rist (steg 6) | Metallkasse som skrangler og rister | 2 | metal rattle; shaking metal box; vending machine shake; cabinet rattle; metal shake |
| 20 | `clank` | E | 0,1–0,5 s | Boksen treffer luka og sprett (steg 5–6) | En boks som treffer metall | 2 | can hit metal; aluminium can clank; metal clank; can bounce metal; tin can hit |
| 21 | `thud` | E | 0,2–0,6 s | Boksen løsner og faller ned i luka (steg 6), og i den lette versjonen | Tyngre dunk av en full boks | 2 | full can drop; can drop thud; heavy thud; object drop metal tray; can land |
| 22 | `drop` | E | 0,1–0,4 s | Boksen slippes langt unna hullet, og den flate boksen faller (steg 1 og 4) | Lett tom boks som slår og spretter | 3 | empty can drop; aluminium can bounce; crushed can drop; can fall floor |
| 23 | `whoosh` | E | 0,4–1 s | Boksen svever opp fra luka (steg 6) | Mykt og luftig sus | 2 | whoosh; soft swoosh; magic whoosh; air swish; levitate whoosh |
| 24 | `tick` | E | 0,05–0,2 s | Hver del av logomåleren (steg 7) og telleren ved knaset | Kort klikk med tone (tonehøyden justeres per del) | 3 | ui tick; click tick; relay click; meter tick; counter click |
| 25 | `grab` | E | 0,05–0,2 s | Du griper boksen (steg 1) | Lite grep og raslelyd | 3 | pick up can; grab object; hand grab; can pick up |
| 26 | `ui` | E | 0,03–0,15 s | Foreslått: handlingsknappen og lyd-chipen | Svært kort og dempet | 3 | ui click soft; button tap; soft click; interface tap |
| 27 | `room` | L | 10–30 s | Valgfri: under alt annet, svakt | Natt utendørs ved butikken: fjern by eller vind | 3 | night city ambience; distant traffic night; parking lot night ambience; urban night room tone |

**Lag som mikses samtidig** (gain-bus, tilfeldig tonehøyde og volum):
- **Flikk:** `pop` og `spray`, med `fizz` like etter.
- **KNAS:** `crush` og `tick`.
- **Fast boks:** `clank` og `rumble`.
- **Ladingen:** `charge` (ett eller to lag) og `tick`.

## Krav til opptakene
- **Lisens:** bare CC0 og CC BY, helst CC0. Aldri NC, Sampling+ eller ukjent lisens.
- **Teknisk:** helst 44,1/48 kHz. Ingen klipping. Kort stillhet i starten (under 30 ms) for alle utløste lyder. Lavt støygulv.
- **Loopene** (`fizz`, `charge`, `hum`, `rollers`, `rumble`, `room`) må kunne skjøtes uten hørbar overgang.
- **Vekt:** Ved integrasjon kuttes klippene. Målet er under ≈ 600 kB for alle lydene samlet i .ogg (pluss tilsvarende .m4a), lastet etter første trykk.
