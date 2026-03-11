import { describe, it, expect, beforeEach } from 'vitest'
import { contrastRule } from '../../src/rules/contrast'
import { ResolvedConfig } from '../../src/types'
import { EvaluationContext } from '../../src/rules'

function makeConfig(
  algorithm: 'apca' | 'wcag' = 'apca',
): ResolvedConfig {
  return {
    contrastAlgorithm: algorithm,
    exclude: [],
    capabilities: { canEvaluatePseudoClasses: true, hasRenderedLayout: true },
  }
}

function setup(html: string): EvaluationContext {
  document.body.innerHTML = html
  return {
    root: document,
    candidates: Array.from(document.body.querySelectorAll('*')),
  }
}

describe('contrast rule', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('passes with sufficient contrast (WCAG)', async () => {
    const ctx = setup(
      '<p style="color: #000; background: #fff;">Hello</p>',
    )
    const result = await contrastRule.evaluate(ctx, makeConfig('wcag'))
    expect(result.status).toBe('pass')
  })

  it('flags insufficient contrast (WCAG)', async () => {
    const ctx = setup(
      '<p style="color: #ccc; background: #fff;">Low contrast</p>',
    )
    const result = await contrastRule.evaluate(ctx, makeConfig('wcag'))
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.ruleId).toBe('contrast')
      expect(result.violation.nodes.length).toBeGreaterThan(0)
    }
  })

  it('passes with sufficient contrast (APCA)', async () => {
    const ctx = setup(
      '<p style="color: #000; background: #fff; font-size: 16px; font-weight: 400;">Hello</p>',
    )
    const result = await contrastRule.evaluate(ctx, makeConfig('apca'))
    expect(result.status).toBe('pass')
  })

  it('flags insufficient contrast (APCA)', async () => {
    const ctx = setup(
      '<p style="color: #bbb; background: #ddd; font-size: 14px; font-weight: 400;">Low contrast</p>',
    )
    const result = await contrastRule.evaluate(ctx, makeConfig('apca'))
    expect(result.status).toBe('violation')
  })

  it('skips hidden elements', async () => {
    const ctx = setup(
      '<p style="color: #ccc; background: #fff; display: none;">Hidden</p>',
    )
    const result = await contrastRule.evaluate(ctx, makeConfig('wcag'))
    expect(result.status).toBe('pass')
  })

  it('skips elements with visibility: hidden', async () => {
    const ctx = setup(
      '<p style="color: #ccc; background: #fff; visibility: hidden;">Hidden</p>',
    )
    const result = await contrastRule.evaluate(ctx, makeConfig('wcag'))
    expect(result.status).toBe('pass')
  })

  it('skips elements with opacity: 0', async () => {
    const ctx = setup(
      '<p style="color: #ccc; background: #fff; opacity: 0;">Hidden</p>',
    )
    const result = await contrastRule.evaluate(ctx, makeConfig('wcag'))
    expect(result.status).toBe('pass')
  })

  it('resolves background from ancestor', async () => {
    const ctx = setup(
      '<div style="background: #000;"><p style="color: #fff;">White on black</p></div>',
    )
    const result = await contrastRule.evaluate(ctx, makeConfig('wcag'))
    expect(result.status).toBe('pass')
  })

  it('marks gradient backgrounds as incomplete', async () => {
    const ctx = setup(
      '<div style="background: linear-gradient(red, blue);"><p style="color: #fff;">Over gradient</p></div>',
    )
    const result = await contrastRule.evaluate(ctx, makeConfig('wcag'))
    expect(result.status).toBe('incomplete')
    if (result.status === 'incomplete') {
      expect(result.reason).toContain('background image')
    }
  })

  it('composites semi-transparent backgrounds', async () => {
    // Semi-transparent dark overlay on white = dark background, white text should pass
    const ctx = setup(`
      <div style="background: #fff;">
        <div style="background: rgba(0, 0, 0, 0.8);">
          <p style="color: #fff;">White on dark overlay</p>
        </div>
      </div>
    `)
    const result = await contrastRule.evaluate(ctx, makeConfig('wcag'))
    expect(result.status).toBe('pass')
  })

  it('skips elements without direct text content', async () => {
    const ctx = setup(
      '<div style="color: #ccc; background: #fff;"><span>Text here</span></div>',
    )
    // The div has no direct text, only the span does
    const result = await contrastRule.evaluate(ctx, makeConfig('wcag'))
    // The span inherits the low contrast from div — it should flag the span
    // but the div itself should be skipped since it has no direct text
    if (result.status === 'violation') {
      expect(result.violation.nodes.every((n) => !n.selector.endsWith('div'))).toBe(true)
    }
  })
})
