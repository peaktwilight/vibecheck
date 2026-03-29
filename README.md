# vibecheck

[![npm](https://img.shields.io/npm/v/vibechecked)](https://www.npmjs.com/package/vibechecked)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)

> Paste a URL. Get roasted. Find out if your UI is actually good or just another vibe-coded clone.

[vibechecked.doruk.ch](https://vibechecked.doruk.ch) | [npm](https://www.npmjs.com/package/vibechecked)

## What is this?

Vibecheck screenshots any website, uses AI for brutal design analysis, and scores it across 5 dimensions. It detects 11 red flags of vibe-coded UIs — the purple gradients, the glassmorphism cards, the "Hero -> Features -> Pricing -> Footer" layout that every AI-generated landing page has. You get a roast, a verdict, and a shareable scorecard PNG.

**Features:**

- **5 scoring dimensions** — Originality, Layout, Typography, Color, Overall
- **11 red flags** detected (purple gradients, glassmorphism, generic SaaS patterns...)
- **`--compare url1 url2`** — head-to-head comparison mode
- **`--json`** — machine-readable JSON output
- **Shareable PNG scorecard** — 1200x630, Twitter/OG-optimized, saved automatically

## Quick Start

```bash
npx vibechecked https://your-site.com
```

That's it. No install needed — `npx` downloads and runs it in one shot.

## No AI? No problem.

Don't have an AI CLI installed? Use heuristic mode:

```bash
npx vibechecked --no-ai https://your-site.com
```

It analyzes color patterns, layout density, and common vibe-coded signatures. Less savage roasts, but zero dependencies.

## Usage

```bash
# Single site
npx vibechecked https://my-app.vercel.app

# Compare two sites head-to-head
npx vibechecked --compare vercel.com linear.app

# JSON output (pipe it, parse it, automate it)
npx vibechecked --json https://example.com
```

## Compare mode

Pit two sites against each other. Vibecheck analyzes both in parallel and declares a winner.

```bash
npx vibechecked --compare vercel.com linear.app
```

Example output:

```
  VIBECHECK  —  head to head

  vercel.com              vs    linear.app
  72/100                        85/100

  Originality  72 ████████    vs   85 ██████████
  Layout       68 ████████    vs   80 █████████
  Typography   75 █████████   vs   88 ██████████
  Color        70 ████████    vs   82 █████████

  MOSTLY FRESH                    CERTIFIED ORIGINAL

  WINNER: linear.app 🏆
```

## JSON output

Get structured data for scripts, dashboards, or CI pipelines.

```bash
npx vibechecked --json https://example.com
```

Returns the full analysis as JSON — scores, roast, red flags, verdict, and vibe-coded probability.

## What it scores

| Dimension | What it measures |
|---|---|
| **Originality** | Human-designed or AI-generated aesthetic? |
| **Layout** | Creative composition or the same template everyone ships? |
| **Typography** | Intentional type choices or default Inter with random weights? |
| **Color** | Real palette or purple gradient + white cards? |
| **Overall** | Weighted average (originality counts 2x) |

Plus a **vibe-coded probability** meter — how likely someone prompted this into existence.

## Red flags it detects

1. Purple/blue gradients on hero sections
2. Glassmorphism cards with blur backgrounds
3. "Hero -> Features -> Testimonials -> Pricing -> Footer" layout
4. Generic stock illustrations or 3D blob shapes
5. "Get Started" / "Start Free Trial" buttons that look identical to every SaaS
6. Excessive rounded corners on everything
7. Dark mode with neon accents (the "developer tool" starter pack)
8. Grid of 3 feature cards with icons
9. Floating mockup screenshots at an angle
10. "Trusted by" logo bars
11. Gradient text on headings

## Verdicts

| Verdict | Meaning |
|---|---|
| **CERTIFIED ORIGINAL** | Actually designed by a human with taste |
| **MOSTLY FRESH** | Some original thinking happened here |
| **KINDA MID** | It's fine. It's all fine. |
| **GENERIC AF** | You've seen this site before. Many times. |
| **VIBE-CODED CLONE** | This was prompted into existence at 2am |

## Shareable Scorecard

Vibechecked generates a 1200x630 PNG scorecard (Twitter/OG image optimized) you can post when you want to publicly shame your competitor's landing page. Saved to `./vibechecked-{domain}.png`.

## CI / GitHub Action

Use vibecheck as a GitHub Action to automatically review UI changes on pull requests. It posts a scorecard comment with scores, roast, and red flags.

```yaml
# .github/workflows/vibecheck.yml
name: Vibecheck
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  vibecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: your-org/deploy-preview@main
        id: deploy

      - uses: peaktwilight/vibechecked@main
        with:
          url: ${{ steps.deploy.outputs.url }}
```

### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `url` | Yes | — | The deployed preview URL to check |
| `threshold` | No | `50` | Minimum overall score to pass (exits with code 1 if below) |

### Threshold gate

Set a minimum score to block PRs with poor design:

```yaml
- uses: peaktwilight/vibechecked@main
  with:
    url: ${{ steps.deploy.outputs.url }}
    threshold: 60
```

If the overall score is below the threshold, the action fails and the check turns red.

### Reusable workflow

This repo also ships a reusable workflow you can call with `workflow_call`:

```yaml
jobs:
  design-review:
    uses: peaktwilight/vibechecked/.github/workflows/vibecheck.yml@main
    with:
      url: ${{ needs.deploy.outputs.preview_url }}
```

## Development

```bash
git clone https://github.com/peaktwilight/vibecheck
cd vibecheck
npm install
npx playwright install chromium
npm run build
node dist/cli.js https://your-app.vercel.app
```

## Requirements

- Node.js 18+
- Playwright Chromium (`npx playwright install chromium`)

## Development

```bash
git clone https://github.com/peaktwilight/vibechecked
cd vibecheck
npm install
npx playwright install chromium
npm run build
node dist/cli.js https://your-app.vercel.app
```

## How it works

1. Captures a 1440x900 @2x screenshot with Playwright (waits for network idle + animations)
2. Uses AI vision analysis
3. Gets scores, a roast, red flags, and a verdict
4. Prints a color-coded terminal scorecard + saves a shareable PNG

## Full disclosure

This entire tool was vibe-coded in a few hours. The irony is fully intentional.

## License

MIT
