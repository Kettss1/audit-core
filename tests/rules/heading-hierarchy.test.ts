import { describe, it, expect, beforeEach } from 'vitest'
import { headingHierarchyRule } from '../../src/rules/heading-hierarchy'
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

describe('heading-hierarchy rule', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('passes with correct hierarchy', async () => {
    const ctx = setup('<h1>Title</h1><h2>Section</h2><h3>Sub</h3>')
    const result = await headingHierarchyRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('flags skipped heading levels', async () => {
    const ctx = setup('<h1>Title</h1><h3>Skipped h2</h3>')
    const result = await headingHierarchyRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.nodes[0].reason).toContain('skips from h1 to h3')
    }
  })

  it('allows upward level jumps', async () => {
    const ctx = setup(
      '<h1>Title</h1><h2>Section</h2><h3>Sub</h3><h2>Back to section</h2>',
    )
    const result = await headingHierarchyRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('flags multiple h1 elements', async () => {
    const ctx = setup('<h1>First</h1><h1>Second</h1>')
    const result = await headingHierarchyRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.nodes.some((n) => n.reason.includes('multiple h1'))).toBe(true)
    }
  })

  it('flags missing h1', async () => {
    const ctx = setup('<h2>No h1 on page</h2>')
    const result = await headingHierarchyRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.nodes.some((n) => n.reason.includes('no h1'))).toBe(true)
    }
  })

  it('passes with no headings at all', async () => {
    const ctx = setup('<p>No headings</p>')
    const result = await headingHierarchyRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })
})
