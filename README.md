# Batteribytte ⚡

Reklamesiden for Battery Fresh, til kolleger og venner: **pant det flate batteriet, og få et fullt.** En nattlig pantemaskin under skiltet «BATTERIBYTTE», i ekte 3D:
1. Du drar den flate boksen inn i hullet, og kameraet dykker etter.
2. Maskinen avviser den («Strekkoden vises ikke»), så du ruller den til strekkoden vises.
3. Pressen knuser den.
4. Du trykker PANT, og lappen skrives ut.
5. Den nye boksen sitter fast, så du rister den løs.
6. Du holder den til logoens «+ ‖» er fylt som et batteri.
7. Du flikker fliken opp.

Til slutt får du pantelappen, som du kan dele. Konsept og vurdering står i `docs/concept.md`, og interaksjonene i `docs/interaction-spec.md`.

- `index.html`, `style.css`: siden. `lib/pant/` er bygget fra `src/pant/` med `tools/build-pant.sh` (three.js 0.187, splittet slik at three.js lastes etter første opptegning).
- `assets/pant/machine.glb` (maskinen og rommet), `assets/can/battery-can.glb` (boksen), `assets/can/spray.webp`, `assets/pant/meter.webp` og `assets/pant/stills/` (plakat og lett reserve) er laget i Blender som Python-modul (`pip install bpy==5.3.0 pillow`) med skriptene i `tools/blender/`.
- Redusert bevegelse, manglende WebGL eller 3D-lasting som feiler gir samme historie som stillbilder, med én knapp per steg.
- Alle handlinger kan gjøres med tastatur og med handlingsknappen. Et live-område forteller skjermleseren hva som skjer.

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
