import { describe, it, expect, beforeEach } from 'vitest'
import { landmarksRule } from '../../src/rules/landmarks'
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

describe('landmarks rule', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('passes with a main landmark', async () => {
    const ctx = setup('<main><p>Content</p></main>')
    const result = await landmarksRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('passes with role="main"', async () => {
    const ctx = setup('<div role="main"><p>Content</p></div>')
    const result = await landmarksRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('flags missing main landmark as critical', async () => {
    const ctx = setup('<div><p>No main</p></div>')
    const result = await landmarksRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.impact).toBe('critical')
    }
  })

  it('flags multiple main without aria-label', async () => {
    const ctx = setup('<main>One</main><main>Two</main>')
    const result = await landmarksRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.nodes.some((n) => n.reason.includes('Multiple main'))).toBe(true)
    }
  })

  it('passes multiple main with aria-label', async () => {
    const ctx = setup(
      '<main aria-label="Primary">One</main><main aria-label="Secondary">Two</main>',
    )
    const result = await landmarksRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('flags multiple nav without aria-label', async () => {
    const ctx = setup(
      '<main>Content</main><nav>One</nav><nav>Two</nav>',
    )
    const result = await landmarksRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.nodes.some((n) => n.reason.includes('Multiple nav'))).toBe(true)
    }
  })
})
