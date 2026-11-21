# Teksturer (generert med Higgsfield)

Bildene her er generert med Higgsfield (modell: GPT Image 2.6) og brukes av `tools/blender/build_machine.py`. De blir pakket inn i `assets/pant/machine.glb`.

| Fil | Hva | Brukes til |
|---|---|---|
| `wall.webp` | Bakgårdsvegg om natta: betong, rosa neon-lyn, lampe, plakatrester, tagging | Bakveggen (`Wall`), 4 × 2,67 m rundt maskinen, med svak egenglød |
| `asphalt.webp` | Våt asfalt, sømløs | Gulvet (`Floor`), gjentatt hver 1,1 m |
| `steel.webp` | Børstet stål med riper og fingermerker, sømløst | Maskinfronten (`Front`) |
| `sticker-*.png` | Fire klistremerker (fra ett ark med gjennomsiktig bakgrunn, klippet ut) | `Sticker-*` på fronten |

I tillegg er `assets/pant/env.webp` (et nattpanorama med neon og våt bakke) generert på samme måte. Siden bruker det til refleksjoner (`scene.environment`), og stillbildene bruker det som verden i Cycles.

Promptene står i git-historikken. Bildene ble skalert ned og konvertert til WebP med PIL.
