import { createCanvas } from "canvas";
import type { VibeCheckResult } from "./analyze.js";

function getScoreColor(score: number): string {
  if (score >= 60) return "#22c55e";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case "CERTIFIED ORIGINAL":
    case "MOSTLY FRESH":
      return "#22c55e";
    case "KINDA MID":
      return "#eab308";
    case "GENERIC AF":
    case "VIBE-CODED CLONE":
      return "#ef4444";
    default:
      return "#ffffff";
  }
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

type CanvasRenderingContext2D = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

export function generateScorecard(url: string, result: VibeCheckResult): Buffer {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, width, height);

  const leftPad = 60;
  const rightPad = 60;
  const contentWidth = width - leftPad - rightPad;

  // --- Title row ---
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText("VIBECHECK", leftPad, 65);

  // Overall score (top right)
  const overallScore = result.scores.overall;
  const scoreColor = getScoreColor(overallScore);
  ctx.fillStyle = scoreColor;
  ctx.font = "bold 48px sans-serif";
  const scoreText = `${overallScore}`;
  const scoreMetrics = ctx.measureText(scoreText);
  ctx.fillText(scoreText, width - rightPad - scoreMetrics.width, 68);

  // "score" label
  ctx.fillStyle = "#666666";
  ctx.font = "16px sans-serif";
  const labelText = "score";
  const labelMetrics = ctx.measureText(labelText);
  ctx.fillText(labelText, width - rightPad - scoreMetrics.width - labelMetrics.width - 10, 58);

  // Divider line
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftPad, 90);
  ctx.lineTo(width - rightPad, 90);
  ctx.stroke();

  // Domain
  const domain = extractDomain(url);
  ctx.fillStyle = "#888888";
  ctx.font = "20px sans-serif";
  ctx.fillText(domain, leftPad, 125);

  // --- Score bars ---
  const categories: { label: string; key: keyof typeof result.scores }[] = [
    { label: "Originality", key: "originality" },
    { label: "Layout", key: "layout" },
    { label: "Typography", key: "typography" },
    { label: "Color", key: "color" },
  ];

  const barStartX = leftPad + 140;
  const barWidth = 500;
  const barHeight = 20;
  let barY = 170;
  const barSpacing = 48;

  for (const cat of categories) {
    const score = result.scores[cat.key];
    const color = getScoreColor(score);

    // Label
    ctx.fillStyle = "#aaaaaa";
    ctx.font = "18px sans-serif";
    ctx.fillText(cat.label, leftPad, barY + 15);

    // Bar background
    ctx.fillStyle = "#333333";
    roundRect(ctx, barStartX, barY, barWidth, barHeight, 4);

    // Bar fill
    const fillWidth = (score / 100) * barWidth;
    if (fillWidth > 0) {
      ctx.fillStyle = color;
      roundRect(ctx, barStartX, barY, fillWidth, barHeight, 4);
    }

    // Score number
    ctx.fillStyle = color;
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(`${score}`, barStartX + barWidth + 16, barY + 17);

    barY += barSpacing;
  }

  // --- Roast text ---
  const roastY = barY + 20;
  ctx.fillStyle = "#cccccc";
  ctx.font = "italic 18px sans-serif";
  const roastText = `"${result.roast}"`;
  const roastLines = wrapText(ctx, roastText, contentWidth);
  let currentRoastY = roastY;
  for (const line of roastLines.slice(0, 3)) {
    ctx.fillText(line, leftPad, currentRoastY);
    currentRoastY += 26;
  }

  // --- Verdict ---
  const verdictY = currentRoastY + 30;
  ctx.fillStyle = "#666666";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("VERDICT:", leftPad, verdictY);

  ctx.fillStyle = getVerdictColor(result.verdict);
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(result.verdict, leftPad + 110, verdictY + 2);

  // --- Vibe-coded probability ---
  const vibeY = verdictY + 45;
  const prob = result.vibe_coded_probability;
  const vibeColor = prob >= 60 ? "#ef4444" : prob >= 40 ? "#eab308" : "#22c55e";

  // Red circle indicator
  ctx.fillStyle = vibeColor;
  ctx.beginPath();
  ctx.arc(leftPad + 8, vibeY - 5, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#cccccc";
  ctx.font = "18px sans-serif";
  ctx.fillText(`${prob}% vibe-coded probability`, leftPad + 28, vibeY);

  // --- Footer branding ---
  ctx.fillStyle = "#333333";
  ctx.font = "14px sans-serif";
  ctx.fillText("vibecheck", width - rightPad - 70, height - 25);

  return canvas.toBuffer("image/png");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();
}

export { extractDomain };
