# Batteribytte ⚡

En liten side for kolleger og venner: en kort produktfilm i svart studio (tre Battery Fresh-bokser, lys som
sveiper over, makro av etiketten, kald røyk), og så spørsmålet «Er du klar?» med Ja / Nei.
Du lader ved å **scrolle** (eller holde inne Ja, som scroller for deg): filmen, batteriet, tekstene og lyset følger
én felles tidslinje. Ved 100 % åpner du boksen selv: da tar en ekte 3D-boks over fra filmen, lades med lyn, smeller opp med sprut
og tar en heltesving du kan overta. Nei slukker lyset. Lyd lages i nettleseren (Web Audio) og starter ved første trykk.

- `index.html`, `style.css`, `app.js` (tilstander, knapper, lyd, fotoreserven), `journey.js` (scroll, film, tidslinje) — uten byggesteg.
- `frames/720/` og `frames/540/` — filmen som bildesekvens (494 WebP-bilder, 24 fps), tegnet på canvas.
  Lages fra `assets/journey2-720.mp4` med `tools/make-frames.sh`. `assets/base-poster.jpg` vises før de er lastet.
- `lib/` — GSAP + ScrollTrigger, Lenis og `can3d.js` (three.js + `src/can3d.js`, bygges med `tools/build-can3d.sh`). Se `lib/README.md`.
- `assets/can/` — klimakset i 3D, laget i Blender (Blender som Python-modul, ingen installasjon: `pip install bpy==5.3.0 pillow`):
  `battery-can.glb` (modellen med lynårer og åpne-animasjon, `tools/blender/build_can.py`; `--render` gir `tools/blender/preview.png`)
  og `spray.webp`/`spray.json` (spruten, `tools/blender/render_spray.py`). Delingsbildet `assets/og.jpg` er `tools/blender/render_og.py`.
- `assets/battery-fresh.webp` (produktfoto, også kilden til 3D-boksen), `assets/og.jpg` (delingsbilde), `favicon.svg`,
  `fonts/` (Archivo Black, SIL OFL, se `fonts/OFL.txt`).
- Respekterer «redusert bevegelse» (ingen scroll-film, fotoboksen lades med knappen) og fungerer med tastatur og skjermleser.
- Interaksjonsspesifikasjon: `docs/interaction-spec.md`.

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
- `interaction-design` (Rastian/interaction-design-skills) ligger i `vendor/interaction-design-skills`, låst til
  `a3f092f9bd183eef8c25ec5ea7f0bb97505b94d3` (31.08.2026). Bare markdown (prinsipper, tilstander, flyter, responstid); ingen kode.
- Alle er sikkerhetssjekket på disse versjonene. Ikke oppdater uten å sjekke den nye versjonen først.
- `vendor/`, `.agents/` og `.claude/` publiseres ikke til Vercel (`.vercelignore`).
