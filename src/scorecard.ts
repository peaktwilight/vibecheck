import chalk from "chalk";
import type { VibeCheckResult } from "./analyze.js";
import { extractDomain } from "./image.js";

const VERDICT_COLORS: Record<string, typeof chalk> = {
  "CERTIFIED ORIGINAL": chalk.green.bold,
  "MOSTLY FRESH": chalk.greenBright,
  "KINDA MID": chalk.yellow,
  "GENERIC AF": chalk.redBright,
  "VIBE-CODED CLONE": chalk.red.bold,
};

function bar(score: number, width: number = 20): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;

  let color: typeof chalk;
  if (score >= 80) color = chalk.green;
  else if (score >= 60) color = chalk.greenBright;
  else if (score >= 40) color = chalk.yellow;
  else if (score >= 20) color = chalk.redBright;
  else color = chalk.red;

  return color("\u2588".repeat(filled)) + chalk.gray("\u2591".repeat(empty)) + " " + color.bold(`${score}`);
}

function vibeCodedMeter(probability: number): string {
  const width = 30;
  const filled = Math.round((probability / 100) * width);
  const empty = width - filled;

  let color: typeof chalk;
  let label: string;
  if (probability >= 80) { color = chalk.red; label = "DEFINITELY VIBE-CODED"; }
  else if (probability >= 60) { color = chalk.redBright; label = "PROBABLY VIBE-CODED"; }
  else if (probability >= 40) { color = chalk.yellow; label = "POSSIBLY VIBE-CODED"; }
  else if (probability >= 20) { color = chalk.greenBright; label = "LIKELY HUMAN-MADE"; }
  else { color = chalk.green; label = "CERTIFIED HANDCRAFTED"; }

  return color("\u2588".repeat(filled)) + chalk.gray("\u2591".repeat(empty)) + " " + color.bold(`${probability}%`) + " " + chalk.dim(label);
}

export function printScorecard(url: string, result: VibeCheckResult): void {
  const verdictColor = VERDICT_COLORS[result.verdict] || chalk.white;

  console.log();
  console.log(chalk.dim("\u2500".repeat(60)));
  console.log();
  console.log(chalk.bold.white("  VIBECHECK") + chalk.dim("  \u2014  is your UI actually good?"));
  console.log();
  console.log(chalk.dim("  URL: ") + chalk.cyan(url));
  console.log();
  console.log(chalk.dim("\u2500".repeat(60)));
  console.log();

  // Scores
  console.log(chalk.bold("  SCORES"));
  console.log();
  console.log(`  Originality   ${bar(result.scores.originality)}`);
  console.log(`  Layout        ${bar(result.scores.layout)}`);
  console.log(`  Typography    ${bar(result.scores.typography)}`);
  console.log(`  Color         ${bar(result.scores.color)}`);
  console.log();
  console.log(`  ${chalk.bold("Overall")}       ${bar(result.scores.overall)}`);
  console.log();

  // Vibe-coded meter
  console.log(chalk.dim("\u2500".repeat(60)));
  console.log();
  console.log(chalk.bold("  VIBE-CODED PROBABILITY"));
  console.log();
  console.log(`  ${vibeCodedMeter(result.vibe_coded_probability)}`);
  console.log();

  // Roast
  console.log(chalk.dim("\u2500".repeat(60)));
  console.log();
  console.log(chalk.bold("  THE ROAST"));
  console.log();
  console.log(`  ${chalk.italic(result.roast)}`);
  console.log();

  // Red flags
  if (result.red_flags?.length) {
    console.log(chalk.dim("\u2500".repeat(60)));
    console.log();
    console.log(chalk.bold.red("  RED FLAGS"));
    console.log();
    for (const flag of result.red_flags) {
      console.log(`  ${chalk.red("\u2716")}  ${flag}`);
    }
    console.log();
  }

  // Good parts
  if (result.good_parts?.length) {
    console.log(chalk.dim("\u2500".repeat(60)));
    console.log();
    console.log(chalk.bold.green("  WHAT'S ACTUALLY GOOD"));
    console.log();
    for (const good of result.good_parts) {
      console.log(`  ${chalk.green("\u2714")}  ${good}`);
    }
    console.log();
  }

  // Verdict
  console.log(chalk.dim("\u2500".repeat(60)));
  console.log();
  console.log(`  VERDICT:  ${verdictColor(result.verdict)}`);
  console.log();
  console.log(chalk.dim("\u2500".repeat(60)));
  console.log();
}

function compactBar(score: number, width: number = 12): string {
  const filled = Math.round((score / 100) * width);
  let color: typeof chalk;
  if (score >= 80) color = chalk.green;
  else if (score >= 60) color = chalk.greenBright;
  else if (score >= 40) color = chalk.yellow;
  else if (score >= 20) color = chalk.redBright;
  else color = chalk.red;
  return color("\u2588".repeat(filled));
}

export function printComparison(
  url1: string,
  result1: VibeCheckResult,
  url2: string,
  result2: VibeCheckResult
): void {
  const domain1 = extractDomain(url1);
  const domain2 = extractDomain(url2);

  const verdictColor1 = VERDICT_COLORS[result1.verdict] || chalk.white;
  const verdictColor2 = VERDICT_COLORS[result2.verdict] || chalk.white;

  const winner =
    result1.scores.overall > result2.scores.overall
      ? domain1
      : result2.scores.overall > result1.scores.overall
        ? domain2
        : "TIE";

  console.log();
  console.log(chalk.dim("\u2500".repeat(60)));
  console.log();
  console.log(chalk.bold.white("  VIBECHECK") + chalk.dim("  \u2014  head to head"));
  console.log();

  // Domain names + overall scores
  const col1 = 20;
  console.log(
    `  ${chalk.cyan(domain1.padEnd(col1))}` +
    chalk.dim("    vs    ") +
    `${chalk.cyan(domain2)}`
  );
  console.log(
    `  ${chalk.bold(`${result1.scores.overall}/100`.padEnd(col1))}` +
    chalk.dim("          ") +
    `${chalk.bold(`${result2.scores.overall}/100`)}`
  );
  console.log();

  // Category comparisons
  const categories: { label: string; key: keyof typeof result1.scores }[] = [
    { label: "Originality", key: "originality" },
    { label: "Layout", key: "layout" },
    { label: "Typography", key: "typography" },
    { label: "Color", key: "color" },
  ];

  for (const cat of categories) {
    const s1 = result1.scores[cat.key];
    const s2 = result2.scores[cat.key];
    const label = cat.label.padEnd(13);
    const score1Str = String(s1).padStart(3);
    const score2Str = String(s2).padStart(3);
    console.log(
      `  ${label}${score1Str} ${compactBar(s1)}` +
      chalk.dim("  vs  ") +
      `${score2Str} ${compactBar(s2)}`
    );
  }

  console.log();

  // Verdicts
  console.log(
    `  ${verdictColor1(result1.verdict.padEnd(col1))}` +
    chalk.dim("          ") +
    `${verdictColor2(result2.verdict)}`
  );
  console.log();

  // Winner
  if (winner === "TIE") {
    console.log(`  ${chalk.bold.yellow("IT'S A TIE!")}`);
  } else {
    console.log(`  ${chalk.bold("WINNER:")} ${chalk.green.bold(winner)} \uD83C\uDFC6`);
  }

  console.log();
  console.log(chalk.dim("\u2500".repeat(60)));
  console.log();
}
