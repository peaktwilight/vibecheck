import chalk from "chalk";

const VERDICT_COLORS = {
  "CERTIFIED ORIGINAL": chalk.green.bold,
  "MOSTLY FRESH": chalk.greenBright,
  "KINDA MID": chalk.yellow,
  "GENERIC AF": chalk.redBright,
  "VIBE-CODED CLONE": chalk.red.bold,
};

function bar(score, width = 20) {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;

  let color;
  if (score >= 80) color = chalk.green;
  else if (score >= 60) color = chalk.greenBright;
  else if (score >= 40) color = chalk.yellow;
  else if (score >= 20) color = chalk.redBright;
  else color = chalk.red;

  return color("\u2588".repeat(filled)) + chalk.gray("\u2591".repeat(empty)) + " " + color.bold(`${score}`);
}

function vibeCodedMeter(probability) {
  const width = 30;
  const filled = Math.round((probability / 100) * width);
  const empty = width - filled;

  let color;
  let label;
  if (probability >= 80) { color = chalk.red; label = "DEFINITELY VIBE-CODED"; }
  else if (probability >= 60) { color = chalk.redBright; label = "PROBABLY VIBE-CODED"; }
  else if (probability >= 40) { color = chalk.yellow; label = "POSSIBLY VIBE-CODED"; }
  else if (probability >= 20) { color = chalk.greenBright; label = "LIKELY HUMAN-MADE"; }
  else { color = chalk.green; label = "CERTIFIED HANDCRAFTED"; }

  return color("\u2588".repeat(filled)) + chalk.gray("\u2591".repeat(empty)) + " " + color.bold(`${probability}%`) + " " + chalk.dim(label);
}

export function printScorecard(url, result) {
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
