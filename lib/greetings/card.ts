import { GreetingTemplate } from "@/lib/types";

export type CardPalette = GreetingTemplate["palette"];

export const DEFAULT_PALETTES: (CardPalette & { name: string })[] = [
  { name: "Sunset Confetti", from: "#FF6B6B", to: "#FFD93D", accent: "#ffffff", text: "#3b1f1f" },
  { name: "Ocean Breeze", from: "#4facfe", to: "#00f2fe", accent: "#ffffff", text: "#022c3a" },
  { name: "Berry Bliss", from: "#f857a6", to: "#ff5858", accent: "#ffffff", text: "#3a0a24" },
  { name: "Midnight Gold", from: "#0f2027", to: "#2c5364", accent: "#f4c95d", text: "#f4c95d" },
];

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0xffffffff;
  };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function confetti(seed: string, palette: CardPalette, count = 26): string {
  const rand = seededRandom(seed);
  const colors = [palette.accent, "#ffffff", palette.from, palette.to];
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = rand() * 1080;
    const y = rand() * 380;
    const size = 6 + rand() * 12;
    const rot = rand() * 360;
    const color = colors[Math.floor(rand() * colors.length)];
    const shape = rand() > 0.5 ? "rect" : "circle";
    const opacity = (0.35 + rand() * 0.4).toFixed(2);
    if (shape === "rect") {
      out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size.toFixed(1)}" height="${(
        size * 0.4
      ).toFixed(1)}" rx="2" fill="${color}" opacity="${opacity}" transform="rotate(${rot.toFixed(
        1
      )} ${x.toFixed(1)} ${y.toFixed(1)})" />`;
    } else {
      out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(size / 2).toFixed(
        1
      )}" fill="${color}" opacity="${opacity}" />`;
    }
  }
  return out;
}

function balloon(cx: number, cy: number, scale: number, color: string, opacity = 0.9): string {
  return `
    <g transform="translate(${cx} ${cy}) scale(${scale})" opacity="${opacity}">
      <path d="M0,110 C -6,150 6,150 0,190" stroke="${color}" stroke-width="2.5" fill="none" opacity="0.7" />
      <ellipse cx="0" cy="0" rx="46" ry="58" fill="${color}" />
      <ellipse cx="-14" cy="-20" rx="14" ry="18" fill="#ffffff" opacity="0.25" />
      <path d="M-8,56 L8,56 L0,72 Z" fill="${color}" />
    </g>`;
}

function cakeIcon(cx: number, cy: number, scale: number, palette: CardPalette): string {
  return `
    <g transform="translate(${cx} ${cy}) scale(${scale})">
      <rect x="-70" y="10" width="140" height="46" rx="8" fill="${palette.accent}" opacity="0.95" />
      <rect x="-56" y="-24" width="112" height="40" rx="8" fill="${palette.accent}" opacity="0.85" />
      <rect x="-70" y="10" width="140" height="10" fill="#00000014" />
      <rect x="-56" y="-24" width="112" height="8" fill="#00000014" />
      <g>
        <rect x="-4" y="-52" width="8" height="30" rx="3" fill="#fff8e7" />
        <path d="M0,-52 C 10,-64 -6,-70 0,-82" stroke="#FFB454" stroke-width="6" fill="none" stroke-linecap="round" />
        <rect x="-34" y="-46" width="7" height="24" rx="3" fill="#fff8e7" />
        <path d="M-30.5,-46 C -22,-57 -37,-62 -30.5,-73" stroke="#FF8FAB" stroke-width="5" fill="none" stroke-linecap="round" />
        <rect x="27" y="-46" width="7" height="24" rx="3" fill="#fff8e7" />
        <path d="M30.5,-46 C 39,-57 24,-62 30.5,-73" stroke="#8B5CF6" stroke-width="5" fill="none" stroke-linecap="round" />
      </g>
    </g>`;
}

function heartIcon(cx: number, cy: number, scale: number, palette: CardPalette): string {
  return `
    <g transform="translate(${cx} ${cy}) scale(${scale})">
      <path d="M0,46 C -46,10 -46,-38 -12,-46 C 4,-50 0,-30 0,-24 C 0,-30 -4,-50 12,-46 C 46,-38 46,10 0,46 Z" fill="${palette.accent}" />
      <path d="M-18,-24 C -22,-14 -18,-4 -8,4" stroke="#ffffff" stroke-width="4" fill="none" opacity="0.4" stroke-linecap="round" />
    </g>`;
}

function diyaIcon(cx: number, cy: number, scale: number): string {
  return `
    <g transform="translate(${cx} ${cy}) scale(${scale})">
      <path d="M-70,10 C -70,42 -30,58 0,58 C 30,58 70,42 70,10 C 70,-2 40,4 0,4 C -40,4 -70,-2 -70,10 Z" fill="#D97706" />
      <path d="M-70,10 C -70,20 -30,28 0,28 C 30,28 70,20 70,10" fill="none" stroke="#B45309" stroke-width="3" opacity="0.6" />
      <ellipse cx="-40" cy="8" rx="6" ry="4" fill="#FDE68A" opacity="0.8" />
      <ellipse cx="40" cy="8" rx="6" ry="4" fill="#FDE68A" opacity="0.8" />
      <path d="M0,-2 C 6,-20 -8,-30 0,-52 C 8,-30 -6,-20 0,-2 Z" fill="#FFB454" />
      <path d="M0,-8 C 3,-18 -4,-24 0,-38 C 4,-24 -3,-18 0,-8 Z" fill="#FFE9A8" />
    </g>`;
}

function pumpkinIcon(cx: number, cy: number, scale: number): string {
  return `
    <g transform="translate(${cx} ${cy}) scale(${scale})">
      <rect x="-6" y="-58" width="12" height="20" rx="5" fill="#4D7C0F" transform="rotate(18)" />
      <ellipse cx="-24" cy="6" rx="26" ry="42" fill="#F97316" />
      <ellipse cx="0" cy="6" rx="26" ry="46" fill="#FB923C" />
      <ellipse cx="24" cy="6" rx="26" ry="42" fill="#F97316" />
      <path d="M-14,-8 L-4,4 L-14,4 Z" fill="#3b1f1f" />
      <path d="M14,-8 L4,4 L14,4 Z" fill="#3b1f1f" />
      <path d="M-14,20 Q0,32 14,20 L10,24 Q0,30 -10,24 Z" fill="#3b1f1f" />
    </g>`;
}

function moonIcon(cx: number, cy: number, scale: number, palette: CardPalette): string {
  return `
    <g transform="translate(${cx} ${cy}) scale(${scale})">
      <path d="M40,-40 A46,46 0 1 0 40,40 A36,36 0 1 1 40,-40 Z" fill="${palette.accent}" />
      <path d="M64,-30 l6,14 14,6 -14,6 -6,14 -6,-14 -14,-6 14,-6 Z" fill="${palette.accent}" opacity="0.9" />
    </g>`;
}

function giftIcon(cx: number, cy: number, scale: number, palette: CardPalette): string {
  return `
    <g transform="translate(${cx} ${cy}) scale(${scale})">
      <rect x="-56" y="-6" width="112" height="70" rx="6" fill="${palette.accent}" />
      <rect x="-56" y="-6" width="112" height="20" fill="#00000014" />
      <rect x="-10" y="-6" width="20" height="70" fill="#ffffff" opacity="0.85" />
      <path d="M-56,-6 L56,-6 L56,-26 Q56,-46 34,-46 Q14,-46 0,-6 Q-14,-46 -34,-46 Q-56,-46 -56,-26 Z" fill="${palette.accent}" opacity="0.9" />
      <rect x="-10" y="-46" width="20" height="40" fill="#ffffff" opacity="0.85" />
    </g>`;
}

function treeIcon(cx: number, cy: number, scale: number): string {
  return `
    <g transform="translate(${cx} ${cy}) scale(${scale})">
      <rect x="-8" y="46" width="16" height="16" fill="#7C5C3B" />
      <polygon points="0,-64 -46,10 46,10" fill="#15803D" />
      <polygon points="0,-38 -38,26 38,26" fill="#16A34A" />
      <polygon points="0,-10 -30,46 30,46" fill="#22C55E" />
      <circle cx="-14" cy="16" r="5" fill="#FBBF24" />
      <circle cx="16" cy="0" r="5" fill="#F87171" />
      <circle cx="0" cy="34" r="5" fill="#60A5FA" />
    </g>`;
}

function splashIcon(cx: number, cy: number, scale: number): string {
  const colors = ["#F97316", "#22C55E", "#3B82F6", "#EC4899", "#FACC15"];
  let drops = "";
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const dx = Math.cos(angle) * 58;
    const dy = Math.sin(angle) * 58;
    drops += `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="14" fill="${colors[i]}" opacity="0.92" />`;
  }
  return `<g transform="translate(${cx} ${cy}) scale(${scale})"><circle r="30" fill="#ffffff" opacity="0.9" />${drops}</g>`;
}

function sparkleburstIcon(cx: number, cy: number, scale: number, palette: CardPalette): string {
  return `
    <g transform="translate(${cx} ${cy}) scale(${scale})" stroke="${palette.accent}" stroke-width="6" stroke-linecap="round">
      <line x1="0" y1="-56" x2="0" y2="56" />
      <line x1="-56" y1="0" x2="56" y2="0" />
      <line x1="-40" y1="-40" x2="40" y2="40" />
      <line x1="40" y1="-40" x2="-40" y2="40" />
      <circle r="14" fill="${palette.accent}" stroke="none" />
    </g>`;
}

function renderOccasionIcon(icon: string, cx: number, cy: number, scale: number, palette: CardPalette): string {
  switch (icon) {
    case "heart":
      return heartIcon(cx, cy, scale, palette);
    case "diya":
      return diyaIcon(cx, cy, scale);
    case "pumpkin":
      return pumpkinIcon(cx, cy, scale);
    case "moon":
      return moonIcon(cx, cy, scale, palette);
    case "gift":
      return giftIcon(cx, cy, scale, palette);
    case "tree":
      return treeIcon(cx, cy, scale);
    case "splash":
      return splashIcon(cx, cy, scale);
    case "sparkleburst":
      return sparkleburstIcon(cx, cy, scale, palette);
    case "cake":
    default:
      return cakeIcon(cx, cy, scale, palette);
  }
}

export function buildCardSvg(opts: {
  name: string;
  message: string;
  relationship?: string | null;
  age?: number | null;
  palette: CardPalette;
  seed?: string;
  /** e.g. "HAPPY BIRTHDAY", "HAPPY ANNIVERSARY", "HAPPY DIWALI" */
  headline?: string;
  /** cake | heart | diya | pumpkin | moon | gift | tree | splash | sparkleburst */
  icon?: string;
  /** shown under the name when there's no meaningful "age" (anniversaries/holidays) */
  subLine?: string;
}): string {
  const { name, palette } = opts;
  const seed = opts.seed || name;
  const W = 1080;
  const H = 1080;
  const headline = opts.headline || "HAPPY BIRTHDAY";
  const icon = opts.icon || "cake";

  const firstName = escapeXml(name.split(" ")[0] || name);
  const ageLine = opts.subLine || (opts.age ? `Turning ${opts.age} today!` : "Celebrating you today!");
  const relLine = opts.relationship ? escapeXml(opts.relationship) : "";

  // Wrap the personal message onto multiple lines (rough char-based wrap).
  const wrapped = wrapText(opts.message, 40).slice(0, 4);

  return `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.from}" />
      <stop offset="100%" stop-color="${palette.to}" />
    </linearGradient>
    <linearGradient id="panel" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.32" />
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="18" />
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)" />

  <circle cx="920" cy="140" r="230" fill="#ffffff" opacity="0.10" filter="url(#soft)" />
  <circle cx="120" cy="850" r="260" fill="#ffffff" opacity="0.10" filter="url(#soft)" />

  ${confetti(seed, palette)}

  ${balloon(150, 210, 1, palette.accent, 0.9)}
  ${balloon(230, 260, 0.75, "#ffffff", 0.55)}
  ${balloon(920, 190, 0.9, "#ffffff", 0.5)}
  ${balloon(960, 250, 0.65, palette.accent, 0.85)}

  ${renderOccasionIcon(icon, 540, 430, 1.05, palette)}

  <text x="540" y="590" text-anchor="middle" font-family="Verdana, 'Segoe UI', Arial, sans-serif" font-size="30" font-weight="700" letter-spacing="6" fill="${palette.accent}">
    ${escapeXml(headline)}
  </text>

  <text x="540" y="668" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="76" font-weight="700" fill="#ffffff">
    ${firstName}!
  </text>

  <text x="540" y="712" text-anchor="middle" font-family="Verdana, 'Segoe UI', Arial, sans-serif" font-size="24" fill="#ffffff" opacity="0.92">
    ${escapeXml(ageLine)}${relLine ? "  ·  " + relLine : ""}
  </text>

  <rect x="0" y="760" width="${W}" height="${H - 760}" fill="url(#panel)" />

  <g font-family="Verdana, 'Segoe UI', Arial, sans-serif" font-size="30" fill="#ffffff" text-anchor="middle">
    ${wrapped
      .map((line, i) => `<text x="540" y="${850 + i * 42}">${escapeXml(line)}</text>`)
      .join("\n    ")}
  </g>
</svg>`;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

export async function renderCardPng(svg: string): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
