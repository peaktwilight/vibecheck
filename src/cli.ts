#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import ora from "ora";
import chalk from "chalk";
import { captureScreenshots } from "./screenshot.js";
import { analyzeScreenshot } from "./analyze.js";
import { printScorecard, printComparison } from "./scorecard.js";
import { generateScorecard, extractDomain } from "./image.js";

const args = process.argv.slice(2);
const compareMode = args.includes("--compare");
const jsonMode = args.includes("--json");

// Filter out flags to get positional args
const positionalArgs = args.filter(a => !a.startsWith("--"));

if (compareMode) {
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
    console.log(`    ${chalk.cyan("vibecheck")} ${chalk.white("--json <url>")}`);
    console.log();
    console.log(chalk.dim("  Examples:"));
    console.log(`    ${chalk.cyan("vibecheck")} https://my-app.vercel.app`);
    console.log(`    ${chalk.cyan("vibecheck")} https://competitor.com`);
    console.log(`    ${chalk.cyan("vibecheck")} http://localhost:3000`);
    console.log(`    ${chalk.cyan("vibecheck")} --compare vercel.com linear.app`);
    console.log(`    ${chalk.cyan("vibecheck")} --json https://my-app.com`);
    console.log();
    process.exit(1);
  }

  // Normalize URL
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
  runSingle(normalizedUrl);
}

async function captureAndAnalyze(rawUrl: string) {
  const normalizedUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const screenshots = await captureScreenshots(normalizedUrl);
  const result = await analyzeScreenshot(screenshots.viewport);
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

  const analyzeSpinner = ora({ text: "Analyzing design...", color: "magenta" }).start();

  let result: Awaited<ReturnType<typeof analyzeScreenshot>>;
  try {
    result = await analyzeScreenshot(screenshots.viewport);
    analyzeSpinner.succeed("Analysis complete");
  } catch (err) {
    analyzeSpinner.fail(`Analysis failed: ${(err as Error).message}`);
    return process.exit(1);
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  printScorecard(normalizedUrl, result);

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
