import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import chalk from "chalk";
import type { VibeCheckResult, VibeCheckScores } from "./analyze.js";
import { extractDomain } from "./image.js";

export interface HistoryEntry {
  date: string;
  scores: VibeCheckScores;
  overall: number;
  verdict: string;
  vibe_coded_probability: number;
}

export type HistoryData = Record<string, HistoryEntry[]>;

const HISTORY_DIR = join(homedir(), ".vibecheck");
const HISTORY_FILE = join(HISTORY_DIR, "history.json");

function ensureHistoryDir(): void {
  if (!existsSync(HISTORY_DIR)) {
    mkdirSync(HISTORY_DIR, { recursive: true });
  }
}

function readHistory(): HistoryData {
  ensureHistoryDir();
  if (!existsSync(HISTORY_FILE)) {
    return {};
  }
  try {
    const raw = readFileSync(HISTORY_FILE, "utf-8");
    return JSON.parse(raw) as HistoryData;
  } catch {
    return {};
  }
}

function writeHistory(data: HistoryData): void {
  ensureHistoryDir();
  writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function saveResult(url: string, result: VibeCheckResult): void {
  const domain = extractDomain(url);
  const history = readHistory();

  const entry: HistoryEntry = {
    date: new Date().toISOString().split("T")[0],
    scores: { ...result.scores },
    overall: result.scores.overall,
    verdict: result.verdict,
    vibe_coded_probability: result.vibe_coded_probability,
  };

  if (!history[domain]) {
    history[domain] = [];
  }
  history[domain].push(entry);
  writeHistory(history);
}

export function getHistory(url: string): HistoryEntry[] {
  const domain = extractDomain(url);
  const history = readHistory();
  return history[domain] || [];
}

function trendIndicator(current: number, previous: number): string {
  const diff = current - previous;
  if (diff > 0) return chalk.green("↑");
  if (diff < 0) return chalk.red("↓");
  return chalk.dim("→");
}

function sparkline(values: number[]): string {
  const chars = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v) => {
      const idx = Math.round(((v - min) / range) * (chars.length - 1));
      const score = v;
      let color: typeof chalk;
      if (score >= 60) color = chalk.green;
      else if (score >= 40) color = chalk.yellow;
      else color = chalk.red;
      return color(chars[idx]);
    })
    .join("");
}

export function printHistory(url: string): void {
  const domain = extractDomain(url);
  const entries = getHistory(url);

  if (entries.length === 0) {
    console.log();
    console.log(chalk.dim("  No history found for ") + chalk.cyan(domain));
    console.log(chalk.dim("  Run a scan with --track to start recording."));
    console.log();
    return;
  }

  console.log();
  console.log(chalk.dim("─".repeat(60)));
  console.log();
  console.log(chalk.bold.white("  VIBECHECK HISTORY") + chalk.dim("  —  ") + chalk.cyan(domain));
  console.log();
  console.log(chalk.dim("─".repeat(60)));
  console.log();

  // Table header
  console.log(
    chalk.dim("  Date       ") +
    chalk.dim("  OVR") +
    chalk.dim("  ORI") +
    chalk.dim("  LAY") +
    chalk.dim("  TYP") +
    chalk.dim("  COL") +
    chalk.dim("  Verdict")
  );
  console.log(chalk.dim("  " + "─".repeat(56)));

  // Table rows
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const prev = i > 0 ? entries[i - 1] : null;

    const overallTrend = prev ? " " + trendIndicator(e.overall, prev.overall) : "  ";
    const oriTrend = prev ? trendIndicator(e.scores.originality, prev.scores.originality) : " ";
    const layTrend = prev ? trendIndicator(e.scores.layout, prev.scores.layout) : " ";
    const typTrend = prev ? trendIndicator(e.scores.typography, prev.scores.typography) : " ";
    const colTrend = prev ? trendIndicator(e.scores.color, prev.scores.color) : " ";

    const scoreColor = (s: number) => {
      if (s >= 60) return chalk.green;
      if (s >= 40) return chalk.yellow;
      return chalk.red;
    };

    console.log(
      `  ${chalk.dim(e.date)}  ` +
      `${scoreColor(e.overall)(String(e.overall).padStart(3))}${overallTrend} ` +
      `${scoreColor(e.scores.originality)(String(e.scores.originality).padStart(3))}${oriTrend} ` +
      `${scoreColor(e.scores.layout)(String(e.scores.layout).padStart(3))}${layTrend} ` +
      `${scoreColor(e.scores.typography)(String(e.scores.typography).padStart(3))}${typTrend} ` +
      `${scoreColor(e.scores.color)(String(e.scores.color).padStart(3))}${colTrend} ` +
      `${chalk.dim(e.verdict)}`
    );
  }

  console.log();

  // Sparkline
  const overallValues = entries.map((e) => e.overall);
  console.log(chalk.bold("  Overall trend:  ") + sparkline(overallValues));
  console.log();

  // Overall trend summary
  if (entries.length >= 2) {
    const first = entries[0];
    const last = entries[entries.length - 1];
    const diff = last.overall - first.overall;
    const checks = entries.length;

    if (diff > 0) {
      console.log(
        chalk.green(`  Score improved by ${diff} points over ${checks} checks`)
      );
    } else if (diff < 0) {
      console.log(
        chalk.red(`  Score declined by ${Math.abs(diff)} points over ${checks} checks`)
      );
    } else {
      console.log(
        chalk.dim(`  Score unchanged over ${checks} checks`)
      );
    }
    console.log();
  }

  console.log(chalk.dim("─".repeat(60)));
  console.log();
}
