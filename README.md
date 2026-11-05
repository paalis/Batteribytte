# Batteribytte ⚡

En liten side for kolleger og venner: en kort produktfilm i svart studio (tre Battery Fresh-bokser, lys som
sveiper over, makro av etiketten, kald røyk), og så spørsmålet «Er du klar?» med Ja / Nei.
Ja lader batteriet på boksen og tenner den; Nei slukker lyset. Lyd lages i nettleseren (Web Audio)
og starter ved første trykk.

- `index.html`, `style.css`, `app.js` — hele siden, uten byggesteg eller avhengigheter.
- `assets/battery-fresh.webp` (produktfoto), `assets/og.jpg` (delingsbilde), `favicon.svg`,
  `fonts/` (Bebas Neue, SIL OFL, se `fonts/OFL.txt`).
- `v1/` — første versjon av siden.
- Respekterer «redusert bevegelse» (hopper rett til spørsmålet) og fungerer med tastatur og skjermleser.

## Agent-verktøy

- `huashu-motion` ligger som git-submodul i `vendor/huashu-motion`, låst til v0.3.1
  (`52467f99c602b76ba86d511d37acdfe93fa1e16e`). Skillen er lenket inn fra `.claude/skills/` og `.agents/skills/`,
  og `bin/om` kjører den klonede `cli/om.js` (ikke siste versjon fra npm).
  Etter kloning: `git submodule update --init`. Oppdatering skjer bevisst: sjekk ny versjon, så
  `git -C vendor/huashu-motion checkout <tag>` og commit.
- `reanimate` ligger i `vendor/reanimate`, låst til `3f7a55a2986a84ca2173e86ee9127eefe31d046d`
  (main 31.10.2026). Første kjøring av `scripts/setup.sh` installerer Playwright, Chromium og ffmpeg (~250 MB).
- `video-director` ligger i `vendor/video-director`, låst til `4747e5c153509ef7f8f7fd1a0aad6acfda36280d`
  (main 29.10.2026). QA-skriptene trenger ffmpeg og Python med numpy og Pillow.
- Alle tre er sikkerhetssjekket på disse versjonene. Ikke oppdater uten å sjekke den nye versjonen først.
- `vendor/`, `.agents/` og `.claude/` publiseres ikke til Vercel (`.vercelignore`).
