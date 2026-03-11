import { describe, it, expect, beforeEach } from 'vitest'
import { createAuditor } from '../src/auditor'

/**
 * A realistic HTML page with intentional accessibility violations.
 *
 * Violations planted:
 * - alt-text: img with no alt, img with filename alt
 * - form-labels: input with no label, select with no label
 * - heading-hierarchy: skips from h1 to h4, no h2
 * - landmarks: no <main> landmark, two <nav> without aria-label
 * - contrast: light gray text on white background (fails both WCAG and APCA)
 * - motion: animation without prefers-reduced-motion query
 *
 * Passes expected:
 * - img with proper alt, labeled input, valid headings within correct levels
 */
const BAD_PAGE = `
  <style>
    .low-contrast { color: #ccc; background: #fff; }
    @keyframes slide { from { transform: translateX(0); } to { transform: translateX(100px); } }
    .animated { animation: slide 2s infinite; }
  </style>

  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
  </nav>

  <nav>
    <a href="/docs">Docs</a>
    <a href="/blog">Blog</a>
  </nav>

  <div id="content">
    <h1>My Website</h1>

    <p class="low-contrast">This text is nearly invisible on white.</p>

    <h4>Skipped heading</h4>

    <img src="photo.jpg">
    <img alt="DSC_0042.jpg" src="camera.jpg">
    <img alt="A red sunset over the ocean" src="sunset.jpg">

    <form>
      <input type="text" id="name">
      <select>
        <option>Choose one</option>
        <option>A</option>
        <option>B</option>
      </select>
      <label for="email">Email</label>
      <input type="email" id="email">
    </form>

    <div class="animated">Sliding content</div>
  </div>
`

/**
 * A clean page with no accessibility violations (for rules that
 * can be tested without real layout).
 */
const GOOD_PAGE = `
  <main>
    <h1>Accessible Page</h1>
    <h2>Introduction</h2>
    <p style="color: #000; background: #fff;">High contrast text.</p>
    <img alt="A friendly cat sitting on a windowsill" src="cat.jpg">
    <img alt="" src="decorative-border.png">
    <form>
      <label for="search">Search</label>
      <input type="search" id="search">
      <label for="country">Country</label>
      <select id="country"><option>US</option></select>
    </form>
    <nav aria-label="Main navigation">
      <a href="/">Home</a>
    </nav>
  </main>
`

describe('integration: realistic bad page', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('finds violations across multiple rules', async () => {
    document.body.innerHTML = BAD_PAGE
    const auditor = createAuditor()
    const result = await auditor.run(document)

    expect(result.meta.rulesRun).toBe(8)

    const violationIds = result.violations.map((v) => v.ruleId)

    // These rules should definitely fire
    expect(violationIds).toContain('alt-text')
    expect(violationIds).toContain('form-labels')
    expect(violationIds).toContain('heading-hierarchy')
    expect(violationIds).toContain('landmarks')
  })

  it('alt-text catches missing alt and filename alt', async () => {
    document.body.innerHTML = BAD_PAGE
    const auditor = createAuditor({ rules: ['alt-text'] })
    const result = await auditor.run(document)

    expect(result.violations.length).toBe(1)
    const v = result.violations[0]
    expect(v.ruleId).toBe('alt-text')
    expect(v.impact).toBe('critical')
    expect(v.category).toBe('semantics')

    // Should flag 2 images: missing alt + filename alt
    expect(v.nodes.length).toBe(2)

    const reasons = v.nodes.map((n) => n.reason)
    expect(reasons.some((r) => r.includes('missing the alt attribute'))).toBe(true)
    expect(reasons.some((r) => r.includes('filename'))).toBe(true)

    // Every node should have a non-empty suggestion
    for (const node of v.nodes) {
      expect(node.suggestion.length).toBeGreaterThan(0)
      expect(node.selector.length).toBeGreaterThan(0)
      expect(node.html.length).toBeGreaterThan(0)
    }
  })

  it('form-labels catches unlabeled inputs', async () => {
    document.body.innerHTML = BAD_PAGE
    const auditor = createAuditor({ rules: ['form-labels'] })
    const result = await auditor.run(document)

    expect(result.violations.length).toBe(1)
    const v = result.violations[0]
    expect(v.ruleId).toBe('form-labels')

    // Should flag at least the unlabeled text input and the unlabeled select
    expect(v.nodes.length).toBeGreaterThanOrEqual(2)

    // The labeled email input should NOT appear
    const selectors = v.nodes.map((n) => n.selector)
    expect(selectors.some((s) => s.includes('email'))).toBe(false)
  })

  it('heading-hierarchy catches h1-to-h4 skip', async () => {
    document.body.innerHTML = BAD_PAGE
    const auditor = createAuditor({ rules: ['heading-hierarchy'] })
    const result = await auditor.run(document)

    expect(result.violations.length).toBe(1)
    const v = result.violations[0]
    expect(v.ruleId).toBe('heading-hierarchy')
    expect(v.category).toBe('structure')

    const reasons = v.nodes.map((n) => n.reason)
    expect(reasons.some((r) => r.includes('skips from h1 to h4'))).toBe(true)
  })

  it('landmarks catches missing main and unlabeled navs', async () => {
    document.body.innerHTML = BAD_PAGE
    const auditor = createAuditor({ rules: ['landmarks'] })
    const result = await auditor.run(document)

    expect(result.violations.length).toBe(1)
    const v = result.violations[0]
    expect(v.ruleId).toBe('landmarks')

    const reasons = v.nodes.map((n) => n.reason)
    // No <main> on the page
    expect(reasons.some((r) => r.includes('no main landmark'))).toBe(true)
    // Two <nav> without aria-label
    expect(reasons.some((r) => r.includes('Multiple nav landmarks'))).toBe(true)
  })

  it('violation nodes have complete shape', async () => {
    document.body.innerHTML = BAD_PAGE
    const auditor = createAuditor()
    const result = await auditor.run(document)

    for (const violation of result.violations) {
      expect(typeof violation.ruleId).toBe('string')
      expect(typeof violation.title).toBe('string')
      expect(typeof violation.description).toBe('string')
      expect(['critical', 'serious', 'moderate', 'minor']).toContain(violation.impact)
      expect(['contrast', 'structure', 'semantics', 'interaction', 'motion']).toContain(
        violation.category,
      )

      for (const node of violation.nodes) {
        expect(typeof node.selector).toBe('string')
        expect(typeof node.html).toBe('string')
        expect(typeof node.reason).toBe('string')
        expect(typeof node.suggestion).toBe('string')
      }
    }
  })

  it('meta has correct shape and values', async () => {
    document.body.innerHTML = BAD_PAGE
    const before = Date.now()
    const auditor = createAuditor()
    const result = await auditor.run(document)
    const after = Date.now()

    expect(result.meta.algorithm).toBe('apca')
    expect(result.meta.rulesRun).toBe(8)
    expect(result.meta.timestamp).toBeGreaterThanOrEqual(before)
    expect(result.meta.timestamp).toBeLessThanOrEqual(after)
  })

  it('exclude config hides violations inside excluded containers', async () => {
    document.body.innerHTML = BAD_PAGE
    const auditor = createAuditor({
      rules: ['alt-text', 'form-labels'],
      exclude: ['#content'],
    })
    const result = await auditor.run(document)

    // All bad images and form inputs are inside #content, so nothing to flag
    const altViolation = result.violations.find((v) => v.ruleId === 'alt-text')
    const formViolation = result.violations.find((v) => v.ruleId === 'form-labels')
    expect(altViolation).toBeUndefined()
    expect(formViolation).toBeUndefined()
  })
})

describe('integration: realistic good page', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('passes all structure/semantics rules with no violations', async () => {
    document.body.innerHTML = GOOD_PAGE
    const auditor = createAuditor({
      rules: ['alt-text', 'form-labels', 'heading-hierarchy', 'landmarks'],
    })
    const result = await auditor.run(document)

    expect(result.violations.length).toBe(0)
    expect(result.passes).toContain('alt-text')
    expect(result.passes).toContain('form-labels')
    expect(result.passes).toContain('heading-hierarchy')
    expect(result.passes).toContain('landmarks')
  })

  it('reports zero violations as empty array', async () => {
    document.body.innerHTML = GOOD_PAGE
    const auditor = createAuditor({
      rules: ['alt-text', 'form-labels', 'heading-hierarchy', 'landmarks'],
    })
    const result = await auditor.run(document)

    expect(result.violations).toEqual([])
  })

  it('can switch to wcag algorithm', async () => {
    document.body.innerHTML = GOOD_PAGE
    const auditor = createAuditor({ contrastAlgorithm: 'wcag' })
    const result = await auditor.run(document)

    expect(result.meta.algorithm).toBe('wcag')
  })
})
