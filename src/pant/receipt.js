// Batteribytte · the pant receipt (pantelapp): the prize, and the thing you share. Drawn on a canvas so the same image
// is the paper hanging out of the machine (a texture in the 3D scene) and the PNG that goes to Web Share.
const W = 480, H = 860;

function line(g, y) { g.save(); g.setLineDash([6, 6]); g.strokeStyle = '#2a2a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(28, y); g.lineTo(W - 28, y); g.stroke(); g.restore(); }
function row(g, y, left, right, size = 22, weight = 600) {
  g.font = `${weight} ${size}px ui-monospace, Menlo, Consolas, monospace`;
  g.textAlign = 'left'; g.fillText(left, 28, y);
  if (right) { g.textAlign = 'right'; g.fillText(right, W - 28, y); }
}
function barcode(g, x, y, w, h, seed) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let cx = x;
  while (cx < x + w) {
    const bw = 2 + Math.floor(rnd() * 4);
    if (rnd() > 0.45) g.fillRect(cx, y, bw, h);
    cx += bw + 1 + Math.floor(rnd() * 2);
  }
}
const pad = (n) => String(n).padStart(2, '0');

// draws the receipt; `printed` (0…1) cuts it off at the paper's edge as it comes out of the slot
export function drawReceipt(canvas, { time = new Date(), tries = 1, count = 1, printed = 1 } = {}) {
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  // thermal paper: warm white, a faint grain, a torn bottom edge
  g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.035})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  g.fillStyle = '#141414';
  g.textAlign = 'center';
  g.font = '400 50px "Archivo Black", "Arial Black", Impact, sans-serif';
  g.fillText('BATTERIBYTTE', W / 2, 82);
  g.font = '600 18px ui-monospace, Menlo, Consolas, monospace';
  g.fillText('PANTESTASJON  ·  ÅPENT HELE NATTA', W / 2, 114);
  line(g, 140);
  const no = String(100000 + (count * 7919) % 900000);
  row(g, 178, 'PANTELAPP', '#' + no, 24, 800);
  row(g, 210, `${pad(time.getDate())}.${pad(time.getMonth() + 1)}.${time.getFullYear()}`, `kl. ${pad(time.getHours())}:${pad(time.getMinutes())}`, 20);
  row(g, 232, count > 1 ? `ditt bytte nr. ${count}` : 'ditt første bytte', null, 16, 500);
  line(g, 246);
  row(g, 280, '1 × BATTERI, FLATT', 'PANTET', 22, 800);
  row(g, 310, tries > 1 ? `  godkjent på ${tries}. forsøk` : '  godkjent med en gang', null, 18, 500);
  row(g, 352, '1 × BATTERY FRESH', 'LADET', 22, 800);
  row(g, 382, '  100 %  ·  åpnet  ·  skummer', null, 18, 500);
  line(g, 410);
  row(g, 452, 'SALDO', '1 FULL LADING', 24, 800);
  row(g, 484, 'Gyldig til', 'du er flat igjen', 18, 500);
  line(g, 510);
  g.font = '400 30px "Archivo Black", "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  g.fillText('DIN TUR?', W / 2, 566);
  g.font = '600 19px ui-monospace, Menlo, Consolas, monospace';
  g.fillText('Bytt batteri du også:', W / 2, 600);
  g.fillText('batteribytte.vercel.app', W / 2, 626);
  barcode(g, 70, 660, W - 140, 90, count * 31 + 7);
  g.font = '600 16px ui-monospace, Menlo, Consolas, monospace';
  g.fillText(`70 ${no} 0${count % 10} 500 ML`, W / 2, 778);
  // torn edge
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) g.lineTo(x, H - 10 - (x / 16 % 2) * 10);
  g.lineTo(W, H); g.closePath(); g.fill();
  if (printed < 1) g.fillRect(0, H * printed, W, H);
  g.globalCompositeOperation = 'source-over';
  return canvas;
}

export async function receiptFonts() {
  try { await document.fonts.load('400 50px "Archivo Black"'); } catch (e) { /* the fallback font will do */ }
}

// share the receipt as an image where the platform can, else the link
export async function shareReceipt(canvas, url) {
  const text = 'Pantelapp: 1 batteri byttet. Din tur?';
  try {
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    const file = blob && new File([blob], 'pantelapp-batteribytte.png', { type: 'image/png' });
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Batteribytte', text, url });
      return 'shared';
    }
    if (navigator.share) { await navigator.share({ title: 'Batteribytte', text, url }); return 'shared'; }
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled';
    return 'failed';
  }
}
