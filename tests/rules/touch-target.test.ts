import { describe, it, expect, beforeEach } from 'vitest'
import { touchTargetRule } from '../../src/rules/touch-target'
import { ResolvedConfig } from '../../src/types'
import { EvaluationContext } from '../../src/rules'

function makeConfig(hasLayout = true): ResolvedConfig {
  return {
    contrastAlgorithm: 'apca',
    exclude: [],
    capabilities: {
      canEvaluatePseudoClasses: true,
      hasRenderedLayout: hasLayout,
    },
  }
}

function setup(html: string): EvaluationContext {
  document.body.innerHTML = html
  return {
    root: document,
    candidates: Array.from(document.body.querySelectorAll('*')),
  }
}

describe('touch-target rule', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('returns incomplete when no rendered layout', async () => {
    const ctx = setup('<button>Click</button>')
    const result = await touchTargetRule.evaluate(ctx, makeConfig(false))
    expect(result.status).toBe('incomplete')
    if (result.status === 'incomplete') {
      expect(result.reason).toContain('rendered layout')
    }
  })

  it('passes for large enough buttons', async () => {
    const ctx = setup(
      '<button style="width: 48px; height: 48px; display: block;">OK</button>',
    )
    const result = await touchTargetRule.evaluate(ctx, makeConfig())
    expect(result.status).toBe('pass')
  })

  it('flags buttons below 24px as critical', async () => {
    const ctx = setup(
      '<button style="width: 16px; height: 16px; display: block; padding: 0; font-size: 10px;">X</button>',
    )
    const result = await touchTargetRule.evaluate(ctx, makeConfig())
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.impact).toBe('critical')
      expect(result.violation.nodes[0].reason).toContain('below the minimum')
    }
  })

  it('flags buttons between 24px and 44px as minor', async () => {
    const ctx = setup(
      '<button style="width: 32px; height: 32px; display: block; padding: 0;">OK</button>',
    )
    const result = await touchTargetRule.evaluate(ctx, makeConfig())
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.impact).toBe('minor')
      expect(result.violation.nodes[0].reason).toContain('below the recommended')
    }
  })

  it('skips inline links in body text', async () => {
    const ctx = setup(
      '<p>Read the <a href="/docs" style="display: inline;">documentation</a> for more info.</p>',
    )
    const result = await touchTargetRule.evaluate(ctx, makeConfig())
    expect(result.status).toBe('pass')
  })

  it('checks checkboxes', async () => {
    const ctx = setup(
      '<input type="checkbox" style="width: 12px; height: 12px;">',
    )
    const result = await touchTargetRule.evaluate(ctx, makeConfig())
    expect(result.status).toBe('violation')
  })

  it('checks radio buttons', async () => {
    const ctx = setup(
      '<input type="radio" style="width: 12px; height: 12px;">',
    )
    const result = await touchTargetRule.evaluate(ctx, makeConfig())
    expect(result.status).toBe('violation')
  })

  it('skips hidden elements', async () => {
    const ctx = setup(
      '<button style="display: none; width: 10px; height: 10px;">Hidden</button>',
    )
    const result = await touchTargetRule.evaluate(ctx, makeConfig())
    expect(result.status).toBe('pass')
  })

  it('checks role="button" elements', async () => {
    const ctx = setup(
      '<div role="button" style="width: 16px; height: 16px; display: block;">X</div>',
    )
    const result = await touchTargetRule.evaluate(ctx, makeConfig())
    expect(result.status).toBe('violation')
  })
})
