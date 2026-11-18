# lib/: built from src/, pinned

| Path | What | Licence |
|---|---|---|
| `pant/` | The page's scripts, built by `tools/build-pant.sh` from `src/pant/`: `main.js` (loads first), and split out and loaded on demand, `world-*.js` (three.js 0.187.0, tree-shaken, with GLTFLoader and RoomEnvironment) and `lite-*.js` | Ours; three.js MIT (`THREE-LICENSE.txt`) |

Rebuild after changing `src/pant/`: `tools/build-pant.sh` (fetches the pinned three.js and esbuild into a temp folder).
