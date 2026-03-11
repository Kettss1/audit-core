import { describe, it, expect, beforeEach } from 'vitest'
import { createAuditor } from '../src/auditor'

describe('createAuditor', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('runs all rules and returns a valid AuditResult', async () => {
    document.body.innerHTML = `
      <main>
        <h1>Title</h1>
        <p style="color: #000; background: #fff;">Good contrast</p>
        <img alt="A sunset" src="sunset.jpg">
        <label for="name">Name</label>
        <input id="name" type="text">
      </main>
    `
    const auditor = createAuditor()
    const result = await auditor.run(document)

    expect(result.meta.algorithm).toBe('apca')
    expect(result.meta.rulesRun).toBe(8)
    expect(typeof result.meta.timestamp).toBe('number')
    expect(Array.isArray(result.violations)).toBe(true)
    expect(Array.isArray(result.passes)).toBe(true)
    expect(Array.isArray(result.incomplete)).toBe(true)
  })

  it('filters rules by config.rules', async () => {
    document.body.innerHTML = '<img src="photo.jpg">'

    const auditor = createAuditor({ rules: ['alt-text'] })
    const result = await auditor.run(document)

    expect(result.meta.rulesRun).toBe(1)
    expect(result.violations.length).toBe(1)
    expect(result.violations[0].ruleId).toBe('alt-text')
    // No other rules should have run
    expect(result.passes).not.toContain('contrast')
    expect(result.passes).not.toContain('landmarks')
  })

  it('runs multiple selected rules', async () => {
    document.body.innerHTML = `
      <main>
        <img src="photo.jpg">
        <input type="text">
      </main>
    `

    const auditor = createAuditor({ rules: ['alt-text', 'form-labels'] })
    const result = await auditor.run(document)

    expect(result.meta.rulesRun).toBe(2)
    const ruleIds = result.violations.map((v) => v.ruleId)
    expect(ruleIds).toContain('alt-text')
    expect(ruleIds).toContain('form-labels')
  })

  it('excludes elements matching exclude selectors', async () => {
    document.body.innerHTML = `
      <main>
        <div class="third-party">
          <img src="no-alt.jpg">
        </div>
        <img alt="Good alt" src="ok.jpg">
      </main>
    `

    const auditor = createAuditor({
      rules: ['alt-text'],
      exclude: ['.third-party'],
    })
    const result = await auditor.run(document)

    // The img inside .third-party should be excluded
    expect(result.violations.length).toBe(0)
    expect(result.passes).toContain('alt-text')
  })

  it('excludes nested elements inside excluded containers', async () => {
    document.body.innerHTML = `
      <main>
        <div id="widget">
          <input type="text">
          <img src="icon.jpg">
        </div>
        <label for="search">Search</label>
        <input id="search" type="text">
      </main>
    `

    const auditor = createAuditor({
      rules: ['form-labels', 'alt-text'],
      exclude: ['#widget'],
    })
    const result = await auditor.run(document)

    // Neither the input nor img inside #widget should be flagged
    for (const v of result.violations) {
      for (const node of v.nodes) {
        expect(node.selector).not.toContain('widget')
      }
    }
  })

  it('uses wcag algorithm when configured', async () => {
    document.body.innerHTML = `
      <main>
        <p style="color: #000; background: #fff;">Text</p>
      </main>
    `

    const auditor = createAuditor({ contrastAlgorithm: 'wcag' })
    const result = await auditor.run(document)

    expect(result.meta.algorithm).toBe('wcag')
  })

  it('defaults to apca algorithm', async () => {
    document.body.innerHTML = '<main><p>Text</p></main>'

    const auditor = createAuditor()
    const result = await auditor.run(document)

    expect(result.meta.algorithm).toBe('apca')
  })

  it('records passes for rules that find no violations', async () => {
    document.body.innerHTML = `
      <main>
        <h1>Title</h1>
        <h2>Section</h2>
      </main>
    `

    const auditor = createAuditor({ rules: ['heading-hierarchy'] })
    const result = await auditor.run(document)

    expect(result.passes).toContain('heading-hierarchy')
    expect(result.violations.length).toBe(0)
  })
})
