/**
 * barcode.js
 * Barcode encoding, decoding, and Code 128 dynamic SVG generator.
 */

// Utility to encode product IDs (making special characters like '-( ' attribute and URL safe)
function encodeId(id) {
  return encodeURIComponent(String(id)).replace(/-/g, '%2D').replace(/\(/g, '%28').replace(/\)/g, '%29');
}

// Utility to decode product IDs back to their original state
function decodeId(encoded) {
  return decodeURIComponent(encoded);
}

// BARCODE SVG SIMULATOR (Code 128 dynamic generator)
function generateBarcodeSVG(code, barHeight = 70) {
  const str = String(code);

  const C128 = [
    [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],
    [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],
    [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],
    [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
    [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],
    [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],
    [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],
    [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
    [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],
    [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],
    [2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],
    [3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],
    [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],
    [1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],
    [1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],
    [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],
    [1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],
    [1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],
    [2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],
    [1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],
    [1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],
    [2,1,1,2,3,2],[2,3,3,1,1,1,2]
  ];

  const START_B = [2,1,1,2,1,4];
  const STOP = [2,3,3,1,1,1,2];

  const symbols = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    if (ch >= 32 && ch <= 126) {
      symbols.push(ch - 32);
    } else {
      symbols.push(0);
    }
  }

  let checksum = 104;
  for (let i = 0; i < symbols.length; i++) {
    checksum += symbols[i] * (i + 1);
  }
  checksum = checksum % 103;

  const mods = [];
  const pushPattern = (pattern) => {
    pattern.forEach((w, idx) => mods.push({ w, bar: idx % 2 === 0 }));
  };

  pushPattern(START_B);
  symbols.forEach(sym => pushPattern(C128[sym]));
  pushPattern(C128[checksum]);
  STOP.forEach((w, idx) => mods.push({ w, bar: idx % 2 === 0 }));

  const QUIET = 10;
  const BAR_H = Number(barHeight) || 70;
  const TEXT_H = 16;
  const TOTAL_H = BAR_H + TEXT_H;

  const dataW = mods.reduce((s, m) => s + m.w, 0);
  const totalW = QUIET * 2 + dataW;

  let rects = '';
  let x = QUIET;
  for (const { w, bar } of mods) {
    if (bar) {
      rects += `<rect x="${x}" y="0" width="${w}" height="${BAR_H}" fill="#0d0d0d"/>`;
    }
    x += w;
  }

  const midX = (totalW / 2).toFixed(1);
  const escaped = str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  return [
    `<svg viewBox="0 0 ${totalW} ${TOTAL_H}" xmlns="http://www.w3.org/2000/svg"`,
    `  shape-rendering="crispEdges" style="width:100%;height:auto;display:block;">`,
    `<rect width="${totalW}" height="${TOTAL_H}" fill="#ffffff"/>`,
    rects,
    `<text x="${midX}" y="${BAR_H + 12}" text-anchor="middle"`,
    `  font-family="'Courier New',Courier,monospace" font-size="8"`,
    `  font-weight="700" letter-spacing="2" fill="#0d0d0d">${escaped}</text>`,
    `</svg>`
  ].join('\n');
}
