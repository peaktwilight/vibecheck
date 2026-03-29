#!/usr/bin/env node

import ora from "ora";
import chalk from "chalk";
import { captureScreenshots } from "./screenshot.js";
import { analyzeScreenshot } from "./analyze.js";
import { printScorecard } from "./scorecard.js";

const url = process.argv[2];

if (!url) {
  console.log();
  console.log(chalk.bold("  vibecheck") + chalk.dim(" — is your UI actually good?"));
  console.log();
  console.log(chalk.dim("  Usage:"));
  console.log(`    ${chalk.cyan("vibecheck")} ${chalk.white("<url>")}`);
  console.log();
  console.log(chalk.dim("  Examples:"));
  console.log(`    ${chalk.cyan("vibecheck")} https://my-app.vercel.app`);
  console.log(`    ${chalk.cyan("vibecheck")} https://competitor.com`);
  console.log(`    ${chalk.cyan("vibecheck")} http://localhost:3000`);
  console.log();
  process.exit(1);
}

// Normalize URL
const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

async function run() {
  const spinner = ora({ text: "Capturing screenshot...", color: "cyan" }).start();

  let screenshots;
  try {
    screenshots = await captureScreenshots(normalizedUrl);
    spinner.succeed("Screenshot captured");
  } catch (err) {
    spinner.fail(`Failed to capture screenshot: ${err.message}`);
    process.exit(1);
  }

  const analyzeSpinner = ora({ text: "Analyzing design...", color: "magenta" }).start();

  let result;
  try {
    result = await analyzeScreenshot(screenshots.viewport);
    analyzeSpinner.succeed("Analysis complete");
  } catch (err) {
    analyzeSpinner.fail(`Analysis failed: ${err.message}`);
    process.exit(1);
  }

  printScorecard(normalizedUrl, result);
}

run().catch((err) => {
  console.error(chalk.red(`\nError: ${err.message}`));
  process.exit(1);
});
