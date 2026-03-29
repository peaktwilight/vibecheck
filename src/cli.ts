#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import ora from "ora";
import chalk from "chalk";
import { captureScreenshots } from "./screenshot.js";
import { analyzeScreenshot } from "./analyze.js";
import { analyzeHeuristic } from "./heuristic.js";
import { printScorecard, printComparison, printLeaderboard, printRoast } from "./scorecard.js";
import type { BatchEntry } from "./scorecard.js";
import { generateScorecard, extractDomain } from "./image.js";
import { saveResult, printHistory } from "./history.js";

const args = process.argv.slice(2);
const compareMode = args.includes("--compare");
const batchMode = args.includes("--batch");
const jsonMode = args.includes("--json");
const noAi = args.includes("--no-ai");
const roastMode = args.includes("--roast");
const trackMode = args.includes("--track");
const historyMode = args.includes("--history");

// Filter out flags to get positional args
const positionalArgs = args.filter(a => !a.startsWith("--"));

if (historyMode) {
  const url = positionalArgs[0];
  if (!url) {
    console.log("Usage: vibecheck --history <url>");
    process.exit(1);
  }
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
  printHistory(normalizedUrl);
} else if (batchMode) {
  runBatch(positionalArgs);
} else if (compareMode) {
  const urls = positionalArgs.filter(a => a.startsWith("http") || a.includes("."));
  if (urls.length < 2) {
    console.log("Usage: vibecheck --compare <url1> <url2>");
    process.exit(1);
  }
  runCompare(urls[0], urls[1]);
} else {
  const url = positionalArgs[0];

  if (!url) {
    console.log();
    console.log(chalk.bold("  vibecheck") + chalk.dim(" \u2014 is your UI actually good?"));
    console.log();
    console.log(chalk.dim("  Usage:"));
    console.log(`    ${chalk.cyan("vibecheck")} ${chalk.white("<url>")}`);
    console.log(`    ${chalk.cyan("vibecheck")} ${chalk.white("--compare <url1> <url2>")}`);
    console.log(`    ${chalk.cyan("vibecheck")} ${chalk.white("--batch <url1> <url2> [url3] ...")}`);
    console.log(`    ${chalk.cyan("vibecheck")} ${chalk.white("--batch urls.txt")}`);
    console.log(`    ${chalk.cyan("vibecheck")} ${chalk.white("--json <url>")}`);
    console.log(`    ${chalk.cyan("vibecheck")} ${chalk.white("--no-ai <url>")}`);
    console.log(`    ${chalk.cyan("vibecheck")} ${chalk.white("--roast <url>")}`);
    console.log(`    ${chalk.cyan("vibecheck")} ${chalk.white("--track <url>")}`);
    console.log(`    ${chalk.cyan("vibecheck")} ${chalk.white("--history <url>")}`);
    console.log();
    console.log(chalk.dim("  Flags:"));
    console.log(`    ${chalk.cyan("--no-ai")}     Heuristic analysis only (no AI needed)`);
    console.log(`    ${chalk.cyan("--roast")}     Extra savage roast mode`);
    console.log(`    ${chalk.cyan("--track")}     Save score to history after scanning`);
    console.log(`    ${chalk.cyan("--history")}   Show score history and trends for a URL`);
    console.log(`    ${chalk.cyan("--compare")}   Compare two URLs side by side`);
    console.log(`    ${chalk.cyan("--batch")}     Analyze multiple URLs at once`);
    console.log(`    ${chalk.cyan("--json")}      Output results as JSON`);
    console.log();
    console.log(chalk.dim("  Examples:"));
    console.log(`    ${chalk.cyan("vibecheck")} https://my-app.vercel.app`);
    console.log(`    ${chalk.cyan("vibecheck")} https://competitor.com`);
    console.log(`    ${chalk.cyan("vibecheck")} http://localhost:3000`);
    console.log(`    ${chalk.cyan("vibecheck")} --compare vercel.com linear.app`);
    console.log(`    ${chalk.cyan("vibecheck")} --batch vercel.com linear.app stripe.com`);
    console.log(`    ${chalk.cyan("vibecheck")} --batch sites.txt`);
    console.log(`    ${chalk.cyan("vibecheck")} --json https://my-app.com`);
    console.log(`    ${chalk.cyan("vibecheck")} --no-ai https://my-app.com`);
    console.log(`    ${chalk.cyan("vibecheck")} --roast https://ugly-site.com`);
    console.log(`    ${chalk.cyan("vibecheck")} --track my-app.com`);
    console.log(`    ${chalk.cyan("vibecheck")} --history my-app.com`);
    console.log();
    process.exit(1);
  }

  // Normalize URL
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
  runSingle(normalizedUrl);
}

async function captureAndAnalyze(rawUrl: string, roast: boolean = false) {
  const normalizedUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const screenshots = await captureScreenshots(normalizedUrl);
  const result = noAi
    ? analyzeHeuristic(screenshots.viewport)
    : await analyzeScreenshot(screenshots.viewport, roast);
  return { url: normalizedUrl, result };
}

async function runCompare(url1: string, url2: string): Promise<void> {
  const spinner = ora({ text: "Capturing screenshots for both sites...", color: "cyan" }).start();

  try {
    const [site1, site2] = await Promise.all([
      captureAndAnalyze(url1),
      captureAndAnalyze(url2),
    ]);
    spinner.succeed("Both sites analyzed");

    if (jsonMode) {
      console.log(JSON.stringify({
        site1: { url: site1.url, ...site1.result },
        site2: { url: site2.url, ...site2.result },
        winner: site1.result.scores.overall >= site2.result.scores.overall ? site1.url : site2.url,
      }, null, 2));
      process.exit(0);
    }

    printComparison(site1.url, site1.result, site2.url, site2.result);
  } catch (err) {
    spinner.fail(`Comparison failed: ${(err as Error).message}`);
    process.exit(1);
  }
}

function resolveUrls(positional: string[]): string[] {
  // If single arg that looks like a file path (not a URL), try reading it
  if (positional.length === 1 && !positional[0].includes("://") && !positional[0].includes(".com") && existsSync(positional[0])) {
    const content = readFileSync(positional[0], "utf-8");
    return content
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith("#"));
  }

  // Also check: single arg ending in .txt is likely a file
  if (positional.length === 1 && positional[0].endsWith(".txt") && existsSync(positional[0])) {
    const content = readFileSync(positional[0], "utf-8");
    return content
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith("#"));
  }

  return positional;
}

async function runBatch(positional: string[]): Promise<void> {
  const urls = resolveUrls(positional);

  if (urls.length < 2) {
    console.log("Usage: vibecheck --batch <url1> <url2> [url3] ...");
    console.log("       vibecheck --batch urls.txt");
    process.exit(1);
  }

  const CONCURRENCY = 3;
  const entries: BatchEntry[] = [];
  const spinner = ora({ text: `Analyzing ${urls.length} sites...`, color: "cyan" }).start();
  let completed = 0;

  // Process URLs with concurrency limit
  const queue = [...urls];

  async function processUrl(rawUrl: string): Promise<void> {
    const normalizedUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    try {
      const { url, result } = await captureAndAnalyze(rawUrl);
      entries.push({ url, result });
    } catch (err) {
      entries.push({ url: normalizedUrl, error: (err as Error).message });
    }
    completed++;
    spinner.text = `Analyzing sites... (${completed}/${urls.length})`;
  }

  // Run with concurrency limit using worker pattern
  let index = 0;

  async function next(): Promise<void> {
    while (index < queue.length) {
      const currentIndex = index++;
      await processUrl(queue[currentIndex]);
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => next());
  await Promise.all(workers);

  spinner.succeed(`Analyzed ${completed} site${completed !== 1 ? "s" : ""}`);

  if (jsonMode) {
    const successful = entries.filter(e => !!e.result);
    const failed = entries.filter(e => !!e.error);
    successful.sort((a, b) => (b.result!.scores.overall) - (a.result!.scores.overall));
    console.log(JSON.stringify({ leaderboard: successful, failed }, null, 2));
    process.exit(0);
  }

  printLeaderboard(entries);
}

async function runSingle(normalizedUrl: string): Promise<void> {
  const spinner = ora({ text: "Capturing screenshot...", color: "cyan" }).start();

  let screenshots: Awaited<ReturnType<typeof captureScreenshots>>;
  try {
    screenshots = await captureScreenshots(normalizedUrl);
    spinner.succeed("Screenshot captured");
  } catch (err) {
    spinner.fail(`Failed to capture screenshot: ${(err as Error).message}`);
    return process.exit(1);
  }

  const analyzeSpinner = ora({
    text: noAi ? "Running heuristic analysis..." : "Analyzing design...",
    color: "magenta",
  }).start();

  let result: Awaited<ReturnType<typeof analyzeScreenshot>>;
  try {
    if (noAi) {
      result = analyzeHeuristic(screenshots.viewport);
      analyzeSpinner.succeed("Heuristic analysis complete (no AI)");
    } else {
      result = await analyzeScreenshot(screenshots.viewport, roastMode);
      analyzeSpinner.succeed(roastMode ? "Roast complete" : "Analysis complete");
    }
  } catch (err) {
    analyzeSpinner.fail(`Analysis failed: ${(err as Error).message}`);
    return process.exit(1);
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  if (roastMode) {
    printRoast(normalizedUrl, result);
  } else {
    printScorecard(normalizedUrl, result);
  }

  // Save to history if --track flag is present
  if (trackMode) {
    saveResult(normalizedUrl, result);
    const domain = extractDomain(normalizedUrl);
    console.log(chalk.dim(`  Score saved. Run vibecheck --history ${domain} to see trends.`));
    console.log();
  }

  // Generate and save PNG scorecard
  try {
    const domain = extractDomain(normalizedUrl);
    const filename = `vibecheck-${domain}.png`;
    const pngBuffer = generateScorecard(normalizedUrl, result);
    writeFileSync(filename, pngBuffer);
    console.log(chalk.dim(`  Scorecard saved to ./${filename}`));
    console.log();
  } catch (err) {
    console.log(chalk.dim(`  (Could not generate scorecard image: ${(err as Error).message})`));
    console.log();
  }
}
