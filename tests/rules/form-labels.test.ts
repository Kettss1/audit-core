import { describe, it, expect, beforeEach } from 'vitest'
import { formLabelsRule } from '../../src/rules/form-labels'
import { ResolvedConfig } from '../../src/types'
import { EvaluationContext } from '../../src/rules'

const config: ResolvedConfig = {
  contrastAlgorithm: 'apca',
  exclude: [],
  capabilities: { canEvaluatePseudoClasses: true, hasRenderedLayout: true },
}

function setup(html: string): EvaluationContext {
  document.body.innerHTML = html
  return {
    root: document,
    candidates: Array.from(document.body.querySelectorAll('*')),
  }
}

describe('form-labels rule', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('passes when input has an associated label', async () => {
    const ctx = setup(
      '<label for="name">Name</label><input id="name" type="text">',
    )
    const result = await formLabelsRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('passes when input is wrapped in label', async () => {
    const ctx = setup('<label>Name <input type="text"></label>')
    const result = await formLabelsRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('passes when input has aria-label', async () => {
    const ctx = setup('<input type="text" aria-label="Search">')
    const result = await formLabelsRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('flags input with no label as critical', async () => {
    const ctx = setup('<input type="text">')
    const result = await formLabelsRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.impact).toBe('critical')
    }
  })

  it('flags placeholder-only input as serious', async () => {
    const ctx = setup('<input type="text" placeholder="Enter name">')
    const result = await formLabelsRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.impact).toBe('serious')
    }
  })

  it('flags title-only input as minor', async () => {
    const ctx = setup('<input type="text" title="Name">')
    const result = await formLabelsRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.impact).toBe('minor')
    }
  })

  it('skips hidden inputs', async () => {
    const ctx = setup('<input type="hidden" name="csrf">')
    const result = await formLabelsRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('skips submit buttons', async () => {
    const ctx = setup('<input type="submit" value="Go">')
    const result = await formLabelsRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('flags broken aria-labelledby', async () => {
    const ctx = setup('<input type="text" aria-labelledby="nonexistent">')
    const result = await formLabelsRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.nodes[0].reason).toContain('does not exist')
    }
  })

  it('flags select elements without label', async () => {
    const ctx = setup(
      '<select><option>A</option><option>B</option></select>',
    )
    const result = await formLabelsRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.impact).toBe('critical')
    }
  })

  it('passes select with label', async () => {
    const ctx = setup(
      '<label for="country">Country</label><select id="country"><option>US</option></select>',
    )
    const result = await formLabelsRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('flags textarea without label', async () => {
    const ctx = setup('<textarea></textarea>')
    const result = await formLabelsRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
  })

  it('passes textarea with aria-label', async () => {
    const ctx = setup('<textarea aria-label="Comments"></textarea>')
    const result = await formLabelsRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('passes valid aria-labelledby reference', async () => {
    const ctx = setup(
      '<span id="lbl">Email</span><input type="email" aria-labelledby="lbl">',
    )
    const result = await formLabelsRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })
})
