import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchStats } from "./fetchers/stats.js";
import { fetchTopLanguages } from "./fetchers/top-langs.js";
import { renderStatsCard } from "./renderers/stats-card.js";
import { renderTopLangsCard } from "./renderers/top-langs-card.js";

const required = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env: ${key}`);
  return v;
};

const main = async () => {
  const token = required("GITHUB_TOKEN");
  const login = required("GH_USERNAME");

  const here = dirname(fileURLToPath(import.meta.url));
  const assetsDir = resolve(here, "../assets");
  await mkdir(assetsDir, { recursive: true });

  const [stats, langs] = await Promise.all([
    fetchStats(login, token, true),
    fetchTopLanguages(login, token, 5),
  ]);

  const statsSvg = renderStatsCard(stats);
  const langsSvg = renderTopLangsCard(langs);

  await Promise.all([
    writeFile(resolve(assetsDir, "stats.svg"), statsSvg),
    writeFile(resolve(assetsDir, "top-langs.svg"), langsSvg),
  ]);

  console.log(`Wrote ${assetsDir}/stats.svg and top-langs.svg`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
