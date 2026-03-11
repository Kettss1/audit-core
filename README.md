# audit-core

[![npm version](https://img.shields.io/npm/v/audit-core)](https://www.npmjs.com/package/audit-core)
[![CI](https://github.com/Kettss1/audit-core/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USER/audit-core/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/audit-core)](./LICENSE)

A framework-agnostic accessibility audit engine for the web. Point it at a DOM, get back structured violations, passes, and incomplete checks — ready to power whatever interface you're building on top.

---

## Installation

```bash
npm install audit-core
```

---

## Quick start

```typescript
import { createAuditor } from 'audit-core'

const auditor = createAuditor()
const results = await auditor.run(document)

console.log(results.violations)
// [
//   {
//     ruleId: 'contrast',
//     impact: 'serious',
//     title: 'Insufficient text contrast',
//     nodes: [
//       {
//         selector: 'p.subtitle',
//         reason: 'Lc 42 — below the recommended Lc 60 for UI text',
//         suggestion: 'Darken the text color or lighten the background to reach Lc 60+',
//       }
//     ]
//   }
// ]
```

---

## Configuration

```typescript
const auditor = createAuditor({
  // 'apca' (default) or 'wcag'
  contrastAlgorithm: 'wcag',

  // run only specific rules by ID — omit to run all
  rules: ['contrast', 'alt-text'],

  // CSS selectors to exclude from all checks
  exclude: ['.third-party-widget', '#cookie-banner'],
})
```

### Available rule IDs

| ID | What it checks |
|---|---|
| `contrast` | Text contrast against background (APCA or WCAG) |
| `alt-text` | Images with missing or non-descriptive alt attributes |
| `heading-hierarchy` | Heading levels that skip or are structurally invalid |
| `landmarks` | Presence and correct use of ARIA landmark regions |
| `focus-visible` | Interactive elements with no visible focus indicator |
| `touch-target` | Interactive elements below minimum tap target size |
| `motion` | Animations without a `prefers-reduced-motion` override |
| `form-labels` | Form inputs without an accessible label |

---

## Understanding results

```typescript
interface AuditResult {
  violations: Violation[]  // rules that failed — fix these
  passes: string[]         // rule IDs that passed
  incomplete: {            // rules that need manual review
    ruleId: string
    reason: string         // why it couldn't be fully evaluated
  }[]
  meta: {
    algorithm: 'apca' | 'wcag'
    rulesRun: number
    timestamp: number
  }
}
```

**`incomplete`** means one of two things:

1. The rule found something it couldn't evaluate automatically (e.g. an image with a suspiciously generic alt text like `alt="image"` that a human should review)
2. The rule requires a real browser environment to run reliably (e.g. touch target sizes in a headless context)

Either way, it's not a pass — it's a flag for human review. The `reason` field explains what happened.

---

## Using the DOM snapshot utility

If you want to capture a serialised snapshot of the page — useful for logging, debugging, or feeding into an LLM for richer advice — `audit-core` exports a `captureSnapshot` helper:

```typescript
import { createAuditor, captureSnapshot } from 'audit-core'

const snapshot = captureSnapshot(document)
const auditor = createAuditor()
const results = await auditor.run(document)

// send both to your backend, an LLM, or save for later
```

---

## Why another accessibility tool?

Most existing tools are WCAG compliance checkers. That's useful, but WCAG 2.x has real limitations — it was written before smartphones, it ignores font weight and size when evaluating contrast, and it produces false passes for color combinations that are genuinely hard to read.

`audit-core` defaults to [APCA](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell) (Accessible Perceptual Contrast Algorithm) — a perceptually uniform contrast model built on modern vision science, and the candidate replacement for WCAG's contrast formula in WCAG 3.0. WCAG 2.x is still available for teams that need it for legal compliance.

The engine also adapts to its environment automatically. Rules that require a real rendered layout (touch targets, focus styles) behave differently in a headless context than in a live browser — and are honest about it instead of silently returning wrong results.

---

## APCA vs WCAG

By default, `audit-core` uses APCA for contrast evaluation. Here's what that means in practice:

| | WCAG 2.x | APCA |
|---|---|---|
| Output | Ratio (e.g. `4.5:1`) | Lc value (e.g. `Lc 75`) |
| Font-aware | No | Yes — threshold varies by size and weight |
| Dark mode | Unreliable | Handles correctly |
| Legal compliance | Yes (ADA, EN 301 549) | Not yet — WCAG 3.0 is pending |

If your users need to demonstrate legal compliance, switch to `wcag`:

```typescript
const auditor = createAuditor({ contrastAlgorithm: 'wcag' })
```

---

## Environment behaviour

`audit-core` detects whether it's running in a real browser or a headless environment automatically, using the `navigator.webdriver` flag set by the W3C WebDriver spec. You don't need to configure this.

Rules that depend on rendered layout or CSS pseudo-classes (`:focus`, `:focus-visible`) will return `incomplete` in headless environments rather than producing unreliable results.

---

## Contributing

Contributions are welcome. If you want to add a rule, the pattern is straightforward — each rule is an object with an `id` and an `evaluate` function. See the [existing rules](./src/rules) for examples and the [CLAUDE.md](./CLAUDE.md) for the full technical spec.

Please open an issue before starting work on a significant change.

```bash
# install dependencies
npm install

# run tests
npm test

# build
npm run build
```

---

## Roadmap

- [ ] Cognitive load scoring
- [ ] Reading level analysis
- [ ] Color vision deficiency simulation
- [ ] WCAG AAA rule coverage
- [ ] i18n for violation messages

---

## License

MIT
