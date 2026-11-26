// Generates original SVG product illustrations into public/products/ (2 per product) and category images.
// Run: npx tsx scripts/gen-images.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CATEGORIES, PRODUCTS, type Art } from "../src/data/catalog";

const OUT = join(process.cwd(), "public", "products");
mkdirSync(OUT, { recursive: true });
const W = 800, H = 1000;

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
let uid = 0;
const id = (p: string) => `${p}${++uid}`;

function frame(bg: string, body: string, variant: number, defs = "") {
  const g1 = id("bg");
  const deco = variant === 0
    ? `<ellipse cx="400" cy="800" rx="250" ry="34" fill="${shade(bg, -0.12)}" opacity=".7"/>
       <rect x="150" y="790" width="500" height="150" rx="10" fill="${shade(bg, -0.05)}"/>
       <rect x="150" y="790" width="500" height="10" fill="${shade(bg, -0.1)}"/>`
    : `<circle cx="640" cy="200" r="150" fill="${shade(bg, 0.35)}" opacity=".8"/>
       <circle cx="140" cy="860" r="190" fill="${shade(bg, -0.06)}"/>
       <path d="M0 720 Q 400 640 800 760 V1000 H0Z" fill="${shade(bg, -0.03)}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs><linearGradient id="${g1}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(bg, 0.25)}"/><stop offset="1" stop-color="${bg}"/></linearGradient>
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>${defs}</defs>
<rect width="${W}" height="${H}" fill="url(#${g1})"/>${deco}${body}
<text x="40" y="970" font-family="Georgia, serif" font-size="22" fill="${shade(bg, -0.35)}" opacity=".6">21<tspan font-style="italic">mine</tspan></text>
</svg>`;
}

// ---------- perfume ----------
function bottle(a: Extract<Art, { type: "perfume" }>, label: string) {
  const gl = id("glass"), lq = id("liq"), cp = id("cap");
  const defs = `<linearGradient id="${gl}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".25" stop-color="#fff" stop-opacity=".1"/><stop offset=".8" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".35"/></linearGradient>
<linearGradient id="${lq}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(a.liquid, 0.2)}"/><stop offset="1" stop-color="${shade(a.liquid, -0.25)}"/></linearGradient>
<linearGradient id="${cp}" x1="0" x2="1"><stop offset="0" stop-color="${shade(a.cap, -0.25)}"/><stop offset=".45" stop-color="${shade(a.cap, 0.35)}"/><stop offset="1" stop-color="${shade(a.cap, -0.3)}"/></linearGradient>`;
  const labelEl = (x: number, y: number, w: number) => `<rect x="${x}" y="${y}" width="${w}" height="74" rx="4" fill="#FBF8F3" opacity=".94"/>
<text x="${x + w / 2}" y="${y + 32}" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="#2B2B2B">21<tspan font-style="italic" fill="#B07A7A">mine</tspan></text>
<text x="${x + w / 2}" y="${y + 56}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" letter-spacing="2" fill="#6b6b6b">${label}</text>`;
  let body = "";
  switch (a.shape) {
    case "square":
      body = `<rect x="350" y="300" width="100" height="70" rx="6" fill="url(#${cp})"/><rect x="372" y="360" width="56" height="40" fill="${shade(a.cap, -0.2)}"/>
<rect x="250" y="395" width="300" height="390" rx="28" fill="url(#${lq})"/><rect x="250" y="395" width="300" height="390" rx="28" fill="url(#${gl})"/>
<rect x="250" y="395" width="300" height="390" rx="28" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="4"/>${labelEl(290, 560, 220)}`;
      break;
    case "round":
      body = `<rect x="360" y="290" width="80" height="110" rx="40" fill="url(#${cp})"/><rect x="378" y="390" width="44" height="30" fill="${shade(a.cap, -0.2)}"/>
<circle cx="400" cy="610" r="185" fill="url(#${lq})"/><circle cx="400" cy="610" r="185" fill="url(#${gl})"/><circle cx="400" cy="610" r="185" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="4"/>${labelEl(300, 580, 200)}`;
      break;
    case "tall":
      body = `<rect x="365" y="210" width="70" height="120" rx="8" fill="url(#${cp})"/><rect x="380" y="325" width="40" height="30" fill="${shade(a.cap, 0.3)}"/>
<path d="M300 360 H500 L520 780 H280 Z" fill="url(#${lq})"/><path d="M300 360 H500 L520 780 H280 Z" fill="url(#${gl})"/><path d="M300 360 H500 L520 780 H280 Z" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="4"/>${labelEl(310, 560, 180)}`;
      break;
    case "facet":
      body = `<path d="M340 300 L400 250 L460 300 L440 380 H360 Z" fill="url(#${cp})"/><rect x="375" y="375" width="50" height="30" fill="${shade(a.cap, -0.2)}"/>
<path d="M270 420 L330 400 H470 L530 420 L560 760 L520 790 H280 L240 760 Z" fill="url(#${lq})"/>
<path d="M270 420 L330 400 H470 L530 420 L560 760 L520 790 H280 L240 760 Z" fill="url(#${gl})"/>
<path d="M330 400 L300 790 M470 400 L500 790 M270 420 L240 760 M530 420 L560 760" stroke="#fff" stroke-opacity=".25" stroke-width="3"/>
<path d="M270 420 L330 400 H470 L530 420 L560 760 L520 790 H280 L240 760 Z" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="4"/>${labelEl(300, 570, 200)}`;
      break;
    case "mist":
      body = `<rect x="370" y="250" width="60" height="50" rx="6" fill="${shade(a.cap, -0.1)}"/><rect x="360" y="290" width="80" height="70" rx="10" fill="url(#${cp})"/>
<rect x="315" y="350" width="170" height="440" rx="40" fill="url(#${lq})"/><rect x="315" y="350" width="170" height="440" rx="40" fill="url(#${gl})"/>
<rect x="315" y="350" width="170" height="440" rx="40" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="4"/>${labelEl(330, 540, 140)}`;
      break;
    case "mini":
    case "set": {
      const cols = ["#8E3B46", "#D8A25E", "#EDE3C8", "#6B3A2A", "#E8C9A0"];
      body = `<rect x="150" y="560" width="500" height="230" rx="16" fill="#2B2B2B"/><rect x="150" y="560" width="500" height="40" rx="16" fill="#3a3a3a"/>
<text x="400" y="700" text-anchor="middle" font-family="Georgia, serif" font-size="46" fill="#F5EEE4">21<tspan font-style="italic" fill="#E7C9C3">mine</tspan></text>
<text x="400" y="740" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="14" letter-spacing="4" fill="#cfc6bb">DISCOVERY SET</text>` +
        cols.map((c, i) => {
          const x = 205 + i * 85; const lg = id("v");
          return `<defs><linearGradient id="${lg}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(c, 0.2)}"/><stop offset="1" stop-color="${shade(c, -0.25)}"/></linearGradient></defs>
<rect x="${x + 12}" y="330" width="36" height="40" rx="4" fill="url(#${cp})"/><rect x="${x}" y="365" width="60" height="200" rx="14" fill="url(#${lg})"/><rect x="${x}" y="365" width="60" height="200" rx="14" fill="url(#${gl})"/>`;
        }).join("");
      break;
    }
  }
  return { defs, body };
}

// ---------- nails ----------
function nailPath(shape: string, w: number, h: number) {
  const r = w / 2;
  switch (shape) {
    case "almond": return `M0 ${h} V${h * 0.45} C0 ${h * 0.15} ${r * 0.6} 0 ${r} 0 C${w - r * 0.6} 0 ${w} ${h * 0.15} ${w} ${h * 0.45} V${h} Z`;
    case "stiletto": return `M0 ${h} V${h * 0.55} C0 ${h * 0.3} ${r * 0.8} ${h * 0.05} ${r} 0 C${w - r * 0.8} ${h * 0.05} ${w} ${h * 0.3} ${w} ${h * 0.55} V${h} Z`;
    case "coffin": return `M0 ${h} V${h * 0.35} L${w * 0.2} 0 H${w * 0.8} L${w} ${h * 0.35} V${h} Z`;
    case "square": return `M0 ${h} V8 Q0 0 8 0 H${w - 8} Q${w} 0 ${w} 8 V${h} Z`;
    case "squoval": return `M0 ${h} V${h * 0.25} Q0 0 ${w * 0.3} 0 H${w * 0.7} Q${w} 0 ${w} ${h * 0.25} V${h} Z`;
    default: return `M0 ${h} V${r} A${r} ${r * 1.1} 0 0 1 ${w} ${r} V${h} Z`; // oval
  }
}
function nails(a: Extract<Art, { type: "nails" }>, variant: number) {
  const fill = id("nf"), shine = id("ns"), clip = id("nc");
  const lengths: Record<string, number> = { almond: 190, stiletto: 230, coffin: 220, square: 150, squoval: 140, oval: 180 };
  const h = lengths[a.shape] ?? 180;
  const w = 78;
  let finishDefs = "";
  const base = a.color;
  if (a.finish === "chrome") finishDefs = `<linearGradient id="${fill}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(base, 0.5)}"/><stop offset=".35" stop-color="${shade(base, -0.2)}"/><stop offset=".55" stop-color="${shade(base, 0.6)}"/><stop offset="1" stop-color="${shade(base, -0.3)}"/></linearGradient>`;
  else if (a.finish === "pearl") finishDefs = `<linearGradient id="${fill}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="${base}"/><stop offset=".7" stop-color="#F3E3EE"/><stop offset="1" stop-color="#E9EEF4"/></linearGradient>`;
  else if (a.finish === "velvet") finishDefs = `<linearGradient id="${fill}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(base, -0.4)}"/><stop offset=".45" stop-color="${base}"/><stop offset=".52" stop-color="${shade(base, 0.55)}"/><stop offset=".6" stop-color="${base}"/><stop offset="1" stop-color="${shade(base, -0.45)}"/></linearGradient>`;
  else if (a.finish === "glitter") finishDefs = `<linearGradient id="${fill}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#F1DCD2"/><stop offset=".45" stop-color="${base}"/><stop offset="1" stop-color="${shade(base, -0.25)}"/></linearGradient>`;
  else finishDefs = `<linearGradient id="${fill}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(base, -0.12)}"/><stop offset=".5" stop-color="${base}"/><stop offset="1" stop-color="${shade(base, -0.15)}"/></linearGradient>`;
  const defs = `${finishDefs}<linearGradient id="${shine}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#fff" stop-opacity=".75"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="${clip}"><path d="${nailPath(a.shape, w, h)}"/></clipPath>`;
  const one = (scale = 1) => {
    let extra = "";
    if (a.finish === "french") extra = `<path d="M-5 ${h * 0.3} Q ${w / 2} ${h * 0.42} ${w + 5} ${h * 0.3} V-5 H-5Z" fill="${a.tip ?? "#fff"}" clip-path="url(#${clip})"/>`;
    if (a.finish === "glitter") {
      let dots = ""; let s = 7;
      for (let i = 0; i < 60; i++) { s = (s * 9301 + 49297) % 233280; const x = (s / 233280) * w; s = (s * 9301 + 49297) % 233280; const y = (s / 233280) * h * 0.6; dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1 + (i % 3)).toFixed(1)}" fill="${i % 2 ? "#FFF6DA" : "#C9A46A"}"/>`; }
      extra = `<g clip-path="url(#${clip})">${dots}</g>`;
    }
    return `<g transform="scale(${scale})"><path d="${nailPath(a.shape, w, h)}" fill="url(#${fill})"/>${extra}
<rect x="${w * 0.15}" y="10" width="${w * 0.6}" height="${h - 20}" fill="url(#${shine})" clip-path="url(#${clip})" opacity=".8"/>
<path d="${nailPath(a.shape, w, h)}" fill="none" stroke="${shade(base, -0.3)}" stroke-opacity=".35" stroke-width="2"/></g>`;
  };
  let body = "";
  if (variant === 0) {
    const angles = [-28, -14, 0, 14, 28];
    body = `<g transform="translate(400 780) scale(1.55)">` + angles.map((ang, i) =>
      `<g transform="rotate(${ang}) translate(${-w / 2} ${-h - 70 + Math.abs(i - 2) * 10})">${one()}</g>`).join("") + `</g>`;
    body = `<ellipse cx="400" cy="770" rx="210" ry="22" fill="#000" opacity=".06" filter="url(#soft)"/>` + body;
  } else {
    // nail tray / palette: 2 rows of nails on a card
    body = `<rect x="160" y="250" width="480" height="560" rx="24" fill="#FBF8F3"/><rect x="160" y="250" width="480" height="560" rx="24" fill="none" stroke="${shade(a.bg, -0.15)}" stroke-width="3"/>`;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
      const sc = 0.78 - (r * 4 + c) * 0.025;
      body += `<g transform="translate(${205 + c * 108} ${290 + r * 260})">${one(sc)}</g>`;
    }
    body += `<text x="400" y="790" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="14" letter-spacing="3" fill="#8b8079">12 SIZES · 24 NAILS</text>`;
  }
  return { defs, body };
}

// ---------- tools ----------
function tool(a: Extract<Art, { type: "tool" }>) {
  const g = id("tg");
  const defs = `<linearGradient id="${g}" x1="0" x2="1"><stop offset="0" stop-color="${shade(a.color, -0.2)}"/><stop offset=".45" stop-color="${shade(a.color, 0.25)}"/><stop offset="1" stop-color="${shade(a.color, -0.25)}"/></linearGradient>`;
  let body = "";
  switch (a.tool) {
    case "glue":
      body = `<path d="M380 250 L420 250 L432 420 H368 Z" fill="#2B2B2B"/><rect x="340" y="410" width="120" height="70" rx="10" fill="url(#${g})"/>
<path d="M330 480 H470 L490 780 Q490 800 470 800 H330 Q310 800 310 780 Z" fill="#FBF8F3" stroke="${shade(a.color, -0.2)}" stroke-width="3"/>
<text x="400" y="610" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="#2B2B2B">21<tspan font-style="italic" fill="#B07A7A">mine</tspan></text>
<text x="400" y="650" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="14" letter-spacing="3" fill="#6b6b6b">NAIL GLUE</text>
<text x="400" y="680" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#8b8b8b">7.5 g</text>`;
      break;
    case "tabs": {
      body = `<rect x="200" y="260" width="400" height="540" rx="18" fill="#FBF8F3" stroke="${shade(a.bg, -0.2)}" stroke-width="3"/>`;
      for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) {
        const sz = 1 - (r * 4 + c) * 0.015;
        body += `<ellipse cx="${270 + c * 87}" cy="${330 + r * 78}" rx="${28 * sz}" ry="${32 * sz}" fill="${a.color}" opacity=".55" stroke="#fff" stroke-width="3"/>`;
      }
      break;
    }
    case "oil":
      body = `<ellipse cx="400" cy="260" rx="40" ry="52" fill="#2B2B2B"/><rect x="370" y="290" width="60" height="110" rx="8" fill="url(#${g})"/>
<rect x="310" y="390" width="180" height="400" rx="30" fill="${a.color}" opacity=".85"/><rect x="310" y="390" width="180" height="400" rx="30" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="4"/>
<rect x="335" y="420" width="22" height="330" rx="11" fill="#fff" opacity=".35"/>
<rect x="335" y="560" width="130" height="110" rx="6" fill="#FBF8F3"/>
<text x="400" y="605" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#2B2B2B">21<tspan font-style="italic" fill="#B07A7A">mine</tspan></text>
<text x="400" y="638" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" letter-spacing="2" fill="#6b6b6b">CUTICLE OIL</text>`;
      break;
    case "kit":
      body = `<rect x="160" y="330" width="480" height="420" rx="40" fill="${a.color}"/><rect x="160" y="330" width="480" height="60" rx="30" fill="${shade(a.color, 0.15)}"/>
<rect x="190" y="352" width="420" height="10" rx="5" fill="#C9A46A"/>
<text x="400" y="580" text-anchor="middle" font-family="Georgia, serif" font-size="58" fill="#F5EEE4">21<tspan font-style="italic" fill="#E7C9C3">mine</tspan></text>
<text x="400" y="625" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="15" letter-spacing="4" fill="#cfc6bb">PREP KIT</text>
<rect x="520" y="230" width="22" height="260" rx="6" fill="#E7C9C3" transform="rotate(18 531 360)"/>
<rect x="250" y="210" width="14" height="240" rx="5" fill="#C0C4CA" transform="rotate(-16 257 330)"/>`;
      break;
    case "file":
      body = `<g transform="rotate(-24 400 520)"><rect x="370" y="200" width="60" height="560" rx="30" fill="${a.color}" opacity=".75"/>
<rect x="370" y="200" width="60" height="560" rx="30" fill="none" stroke="#fff" stroke-width="4" stroke-opacity=".8"/>
<rect x="382" y="230" width="14" height="360" rx="7" fill="#fff" opacity=".45"/>
<rect x="370" y="620" width="60" height="140" rx="0" fill="${shade(a.color, -0.15)}" opacity=".6"/></g>`;
      break;
  }
  return { defs, body };
}

// ---------- jewellery & accessories ----------
function jewel(a: Extract<Art, { type: "jewel" }>) {
  const g = id("jg"), p = id("pearl");
  const defs = `<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(a.color, 0.45)}"/><stop offset=".5" stop-color="${a.color}"/><stop offset="1" stop-color="${shade(a.color, -0.35)}"/></linearGradient>
<radialGradient id="${p}" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="${a.accent}"/><stop offset="1" stop-color="${shade(a.accent, -0.2)}"/></radialGradient>`;
  let body = "";
  switch (a.jewel) {
    case "huggie":
      body = [300, 500].map((x) => `<circle cx="${x}" cy="440" r="70" fill="none" stroke="url(#${g})" stroke-width="22"/>
<rect x="${x - 5}" y="505" width="10" height="40" fill="url(#${g})"/><circle cx="${x}" cy="580" r="42" fill="url(#${p})"/>`).join("");
      break;
    case "necklace": {
      let links = "";
      for (let i = 0; i <= 40; i++) { const t = i / 40, x = 170 + t * 460, y = 330 + Math.sin(t * Math.PI) * 330; links += `<circle cx="${x}" cy="${y}" r="5" fill="${a.color}"/>`; }
      body = `<path d="M170 300 Q400 560 630 300" fill="none" stroke="url(#${g})" stroke-width="18" stroke-linecap="round"/>${links}
<path d="M170 300 Q400 560 630 300" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-dasharray="6 8"/>`;
      break;
    }
    case "bracelet": {
      let stones = "";
      for (let i = 0; i < 26; i++) { const t = (i / 25) * Math.PI * 1.6 + Math.PI * 0.7; const x = 400 + Math.cos(t) * 210, y = 520 + Math.sin(t) * 150; stones += `<rect x="${x - 14}" y="${y - 14}" width="28" height="28" rx="4" fill="url(#${g})"/><circle cx="${x}" cy="${y}" r="10" fill="url(#${p})"/>`; }
      body = stones;
      break;
    }
    case "claw":
      body = `<path d="M250 420 Q400 330 550 420 L560 470 Q400 400 240 470 Z" fill="${a.color}" stroke="${shade(a.color, -0.2)}" stroke-width="3"/>` +
        [0, 1, 2, 3, 4, 5].map((i) => `<path d="M${270 + i * 52} 470 q 10 150 -4 250" fill="none" stroke="${shade(a.color, -0.08)}" stroke-width="28" stroke-linecap="round"/>`).join("") +
        [0, 1, 2, 3, 4, 5, 6].map((i) => `<circle cx="${280 + i * 40}" cy="${420 - Math.sin((i / 6) * Math.PI) * 38}" r="15" fill="url(#${p})"/>`).join("");
      break;
    case "scrunchie":
      body = [[300, 430, a.color], [500, 470, a.accent], [400, 640, shade(a.color, -0.15)]].map(([x, y, c]) => {
        let ruff = "";
        for (let i = 0; i < 18; i++) { const t = (i / 18) * Math.PI * 2; ruff += `<ellipse cx="${Number(x) + Math.cos(t) * 90}" cy="${Number(y) + Math.sin(t) * 90}" rx="44" ry="34" transform="rotate(${(t * 180) / Math.PI} ${Number(x) + Math.cos(t) * 90} ${Number(y) + Math.sin(t) * 90})" fill="${c}" stroke="${shade(String(c), -0.12)}" stroke-width="2"/>`; }
        return `${ruff}<circle cx="${x}" cy="${y}" r="52" fill="${shade(a.bg, 0.2)}"/>`;
      }).join("");
      break;
    case "scarf": {
      body = `<g transform="rotate(12 400 520)"><rect x="200" y="320" width="400" height="400" fill="${a.color}"/>
<rect x="220" y="340" width="360" height="360" fill="none" stroke="${a.accent}" stroke-width="6"/>
<rect x="250" y="370" width="300" height="300" fill="none" stroke="#F5EEE4" stroke-width="2"/>
<path d="M400 390 L520 520 L400 650 L280 520 Z" fill="none" stroke="${a.accent}" stroke-width="5"/>
<path d="M400 440 L470 520 L400 600 L330 520 Z" fill="#F5EEE4" opacity=".8"/>
<text x="400" y="530" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="${a.accent}">21</text></g>`;
      break;
    }
    case "sunglasses":
      body = `<path d="M150 440 Q160 400 230 400 H350 Q380 400 378 440 Q370 560 270 560 Q170 560 150 440Z" fill="${a.accent}" opacity=".85" stroke="${a.color}" stroke-width="18"/>
<path d="M650 440 Q640 400 570 400 H450 Q420 400 422 440 Q430 560 530 560 Q630 560 650 440Z" fill="${a.accent}" opacity=".85" stroke="${a.color}" stroke-width="18"/>
<path d="M378 430 Q400 410 422 430" fill="none" stroke="${a.color}" stroke-width="14"/>
<path d="M150 430 L120 380 M650 430 L680 380" stroke="${a.color}" stroke-width="16" stroke-linecap="round"/>
<path d="M190 450 Q230 420 280 430" stroke="#fff" stroke-opacity=".5" stroke-width="8" fill="none" stroke-linecap="round"/>`;
      break;
    case "charm":
      body = `<circle cx="400" cy="270" r="32" fill="none" stroke="url(#${g})" stroke-width="12"/>
<path d="M400 300 V420" stroke="url(#${g})" stroke-width="8"/>` +
        [0, 1, 2].map((i) => `<path d="M400 420 L${330 + i * 70} 520" stroke="url(#${g})" stroke-width="6"/><circle cx="${330 + i * 70}" cy="540" r="24" fill="url(#${p})"/>`).join("") +
        `<path d="M400 600 C360 560 300 600 340 650 L400 710 L460 650 C500 600 440 560 400 600Z" fill="url(#${g})"/>
<rect x="455" y="560" width="70" height="40" rx="8" fill="url(#${g})"/><text x="490" y="588" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="#fff">21</text>`;
      break;
  }
  return { defs, body };
}

const escXml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function infoCard(p: (typeof PRODUCTS)[number], label: string) {
  // Small product art at the top + key facts as an info card
  const full = render(p.art, 0, label);
  const inner = full.replace(/^[\s\S]*?<\/defs>/, "").replace(/<\/svg>\s*$/, "");
  const defs = (full.match(/<defs>[\s\S]*?<\/defs>/g) ?? []).join("");
  const facts = Object.entries(p.details).filter(([, v]) => v.length < 60).slice(0, 5);
  const rows = facts.map(([k, v], i) => `<text x="90" y="${640 + i * 62}" font-family="Helvetica, Arial, sans-serif" font-size="17" letter-spacing="1.5" fill="#8b8079">${escXml(k.toUpperCase())}</text>
<text x="90" y="${666 + i * 62}" font-family="Georgia, serif" font-size="24" fill="#2B2B2B">${escXml(v)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}
<rect width="${W}" height="${H}" fill="#FBF8F3"/>
<g transform="translate(200 20) scale(0.5)">${inner}</g>
<line x1="90" x2="710" y1="585" y2="585" stroke="#E7DED3" stroke-width="2"/>${rows}
<text x="40" y="970" font-family="Georgia, serif" font-size="22" fill="#B07A7A" opacity=".8">21<tspan font-style="italic">mine</tspan></text></svg>`;
}

function render(art: Art, variant: number, label: string): string {
  if (variant === 2) {
    const dark = { ...art, bg: "#3B3532" } as Art;
    return render(dark, 1, label);
  }
  const bg = variant === 0 ? art.bg : shade(art.bg, -0.04);
  let r: { defs: string; body: string };
  if (art.type === "perfume") r = bottle(art, label);
  else if (art.type === "nails") r = nails(art, variant);
  else if (art.type === "tool") r = tool(art);
  else r = jewel(art);
  const body = variant === 1 && art.type !== "nails"
    ? `<g transform="translate(400 520) scale(1.12) rotate(-6) translate(-400 -520)">${r.body}</g>`
    : r.body;
  return frame(bg, body, variant, r.defs);
}

for (const p of PRODUCTS) {
  const label = (p.variants[0].options.Size ?? p.category.replace(/-/g, " ")).toUpperCase();
  for (const v of [0, 1, 2]) writeFileSync(join(OUT, `${p.slug}-${v + 1}.svg`), render(p.art, v, label));
  writeFileSync(join(OUT, `${p.slug}-4.svg`), infoCard(p, label));
}
// Category images reuse the lead product's art
for (const c of CATEGORIES) {
  const lead = PRODUCTS.find((p) => p.category === c.slug && p.featured) ?? PRODUCTS.find((p) => p.category === c.slug)!;
  writeFileSync(join(OUT, `category-${c.slug}.svg`), render(lead.art, 1, (lead.variants[0].options.Size ?? "").toUpperCase()));
}
console.log(`Generated ${PRODUCTS.length * 4 + CATEGORIES.length} images in public/products`);
