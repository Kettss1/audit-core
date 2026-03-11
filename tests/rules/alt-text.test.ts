import { describe, it, expect, beforeEach } from 'vitest'
import { altTextRule } from '../../src/rules/alt-text'
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

describe('alt-text rule', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('passes when images have proper alt text', async () => {
    const ctx = setup('<img alt="A red sunset over the ocean" src="sunset.jpg">')
    const result = await altTextRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('passes for decorative images with alt=""', async () => {
    const ctx = setup('<img alt="" src="decorative.jpg">')
    const result = await altTextRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('flags images with no alt attribute', async () => {
    const ctx = setup('<img src="photo.jpg">')
    const result = await altTextRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.nodes[0].reason).toContain('missing the alt attribute')
    }
  })

  it('flags filename alt text', async () => {
    const ctx = setup('<img alt="DSC_0392.jpg" src="photo.jpg">')
    const result = await altTextRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.nodes[0].reason).toContain('filename')
    }
  })

  it('flags placeholder alt text', async () => {
    const ctx = setup('<img alt="image" src="photo.jpg">')
    const result = await altTextRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.nodes[0].reason).toContain('placeholder')
    }
  })

  it('flags SVGs without accessible name', async () => {
    const ctx = setup('<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg>')
    const result = await altTextRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
  })

  it('flags role="img" without accessible name', async () => {
    const ctx = setup('<div role="img"></div>')
    const result = await altTextRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.nodes[0].reason).toContain('role="img"')
    }
  })

  it('passes role="img" with aria-label', async () => {
    const ctx = setup('<div role="img" aria-label="A decorative chart"></div>')
    const result = await altTextRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('flags single character alt text', async () => {
    const ctx = setup('<img alt="x" src="photo.jpg">')
    const result = await altTextRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.nodes[0].reason).toContain('single character')
    }
  })

  it('passes SVGs with title', async () => {
    const ctx = setup(
      '<svg viewBox="0 0 10 10"><title>A circle</title><circle cx="5" cy="5" r="5"/></svg>',
    )
    const result = await altTextRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('passes SVGs marked as decorative', async () => {
    const ctx = setup('<svg aria-hidden="true" viewBox="0 0 10 10"></svg>')
    const result = await altTextRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })
})
