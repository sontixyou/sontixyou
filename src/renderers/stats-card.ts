import type { Stats } from "../fetchers/stats.js";

const THEME = {
  title: "#41B883",
  icon: "#41B883",
  text: "#273849",
  bg: "#FFFFFF",
  border: "#E4E2E2",
};

const fmt = (n: number) => n.toLocaleString("en-US");

const row = (y: number, icon: string, label: string, value: number) => `
  <g transform="translate(25, ${y})">
    <text x="0" y="12.5" fill="${THEME.icon}" font-size="14">${icon}</text>
    <text x="25" y="12.5" fill="${THEME.text}" font-size="14">${label}:</text>
    <text x="180" y="12.5" fill="${THEME.text}" font-size="14" font-weight="600">${fmt(value)}</text>
  </g>`;

const rankCircle = (rank: { level: string; percentile: number }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = ((100 - rank.percentile) / 100) * circumference;
  return `
  <g transform="translate(365, 97)">
    <circle r="${radius}" cx="0" cy="0" fill="none" stroke="#E4E2E2" stroke-width="6"/>
    <circle r="${radius}" cx="0" cy="0" fill="none" stroke="${THEME.title}" stroke-width="6"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${circumference - progress}"
            stroke-linecap="round"
            transform="rotate(-90)"/>
    <text x="0" y="0" text-anchor="middle" dy=".35em" fill="${THEME.text}" font-size="22" font-weight="700">${rank.level}</text>
  </g>`;
};

export const renderStatsCard = (stats: Stats): string => {
  const title = `${stats.name}'s GitHub Stats`;
  const W = 495, H = 195;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif">
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="4.5" fill="${THEME.bg}" stroke="${THEME.border}"/>
  <text x="25" y="35" fill="${THEME.title}" font-size="18" font-weight="600">${title}</text>
${row(60, "★", "Total Stars Earned", stats.totalStars)}
${row(85, "⊙", "Total Commits", stats.totalCommits)}
${row(110, "⇄", "Total PRs", stats.totalPRs)}
${row(135, "◎", "Total Issues", stats.totalIssues)}
${row(160, "▼", "Contributed to (last year)", stats.contributedTo)}
  ${rankCircle(stats.rank)}
</svg>
`;
};
