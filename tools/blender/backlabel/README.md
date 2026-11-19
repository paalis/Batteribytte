# The back of the label, stitched from photos

The product photo (`assets/battery-fresh.webp`) only shows the front of the can. The back is stitched from 16 photos of
a real can turned in the hand. The result is `tools/blender/label_360.webp`, which `build_can.py` uses for the back,
left of the «+» and right of «BATTERY».

The photos are not in the repository. To redo the stitch, put them in a folder as `<number>.jpg` (IMG_1844–1859),
scale them to 1512 px wide as `n<number>.png`, and export the front label as `front.png`
(`build_can.build_label()`, rows top-down). Then run these scripts in that folder with the
OpenCV/NumPy/SciPy/Pillow virtualenv:

1. `edges.py` finds the can's silhouette in each photo (`geo.json`). The edges for 1854 and 1857 were set by hand.
2. `match.py` matches SIFT features between neighbouring photos and against the front label (`matches.pkl`).
3. `solve.py` fits every photo to the same cylinder at the same time (angle, height, row curvature and vertical
   scale per photo; `P3.npy`), and drops matches that disagree.
4. `compose.py` builds the label:
   - each part of the back comes from one photo (1852 for the ingredients, 1853 for the barcode, 1850 for the seam
     and 1848 for the English text), with the seams in empty label;
   - the light is flattened and the colours are matched to the front, row by row;
   - the hand at the bottom is filled with the label's own red;
   - the heights are mapped onto the front label using «EXOTIC FRUIT», «BATTERY» and the can's bottom;
   - the seams with the front: the back's colour is shifted row by row to meet the front, fading out over a tenth
     of a turn;
   - the barcode is drawn, not photographed: EAN-13 7044610799490, read off the photos (the check digit agrees),
     on a white panel, turned a quarter like on the can.

The barcode sits at u ≈ 0.765, 95° right of the front. `src/pant/world.js` (`BAR`) rolls it face up under the scanner's lasers (θ = 125°, a little toward the camera so it reads).
