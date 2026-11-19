// Batteribytte · your own count, kept in this browser only (no server): batteries swapped today and in all. The
// machine's screen shows today's number as it crushes; the receipt carries your swap number. Private mode or blocked
// storage: it counts from zero each time, quietly.
const KEY = 'bb-count2';
const day = () => new Date().toISOString().slice(0, 10);
function read() {
  let v = null;
  try { v = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* blocked or broken */ }
  if (!v) { let old = 0; try { old = Number(localStorage.getItem('bb-count')) || 0; } catch (e) { /* ignore */ } v = { day: day(), today: 0, total: old }; }
  if (v.day !== day()) { v.day = day(); v.today = 0; }   // a new day starts at zero
  return v;
}
export const peek = () => read();
export function bump() {
  const v = read(); v.today += 1; v.total += 1;
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private mode */ }
  return v;
}
