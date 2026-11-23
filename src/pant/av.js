// Batteribytte · asset URLs with their content hash (?v=…), so a browser that cached an older machine, still or
// sound (assets/ is cached for a week, and served stale for a month after) fetches the new one as soon as it changes.
// tools/build-pant.sh hashes every file under assets/ and passes the table in as ASSET_V; unbuilt, paths stay as is.
/* global ASSET_V */
const AV = typeof ASSET_V === 'object' ? ASSET_V : {};
export const av = (p) => (AV[p] ? `${p}?v=${AV[p]}` : p);
