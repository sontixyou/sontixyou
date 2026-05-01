import type { Language } from "../fetchers/top-langs.js";

const THEME = {
  title: "#41B883",
  text: "#273849",
  bg: "#FFFFFF",
  border: "#E4E2E2",
};

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;
const safeColor = (c: string) => (HEX_COLOR.test(c) ? c : "#858585");

export const renderTopLangsCard = (langs: Language[]): string => {
  const W = 300;
  const headerY = 35;
  const firstRowY = 60;
  const rowGap = 35;
  const H = firstRowY + langs.length * rowGap + 10;

  const total = langs.reduce((s, l) => s + l.size, 0) || 1;

  const rows = langs
    .map((l, i) => {
      const pct = (l.size / total) * 100;
      const barW = 250;
      const fillW = (pct / 100) * barW;
      const y = firstRowY + i * rowGap;
      return `
  <g transform="translate(25, ${y})">
    <text x="0" y="0" fill="${THEME.text}" font-size="13">${escapeXml(l.name)}</text>
    <text x="${barW}" y="0" text-anchor="end" fill="${THEME.text}" font-size="13">${pct.toFixed(2)}%</text>
    <rect x="0" y="8" width="${barW}" height="8" rx="4" fill="#E4E2E2"/>
    <rect x="0" y="8" width="${fillW}" height="8" rx="4" fill="${safeColor(l.color)}"/>
  </g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif">
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="4.5" fill="${THEME.bg}" stroke="${THEME.border}"/>
  <text x="25" y="${headerY}" fill="${THEME.title}" font-size="18" font-weight="600">Most Used Languages</text>
${rows}
</svg>
`;
};
