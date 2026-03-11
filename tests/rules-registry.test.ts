import { describe, it, expect } from 'vitest'
import { getAllRules } from '../src/rules'
import { ResolvedConfig } from '../src/types'

function makeConfig(rules?: string[]): ResolvedConfig {
  return {
    contrastAlgorithm: 'apca',
    rules,
    exclude: [],
    capabilities: { canEvaluatePseudoClasses: true, hasRenderedLayout: true },
  }
}

describe('getAllRules', () => {
  it('returns all 8 rules when config.rules is undefined', () => {
    const rules = getAllRules(makeConfig())
    expect(rules.length).toBe(8)

    const ids = rules.map((r) => r.id)
    expect(ids).toContain('contrast')
    expect(ids).toContain('alt-text')
    expect(ids).toContain('form-labels')
    expect(ids).toContain('heading-hierarchy')
    expect(ids).toContain('landmarks')
    expect(ids).toContain('focus-visible')
    expect(ids).toContain('touch-target')
    expect(ids).toContain('motion')
  })

  it('filters to only specified rules', () => {
    const rules = getAllRules(makeConfig(['alt-text', 'contrast']))
    expect(rules.length).toBe(2)
    expect(rules[0].id).toBe('contrast')
    expect(rules[1].id).toBe('alt-text')
  })

  it('returns empty array for non-existent rule IDs', () => {
    const rules = getAllRules(makeConfig(['nonexistent']))
    expect(rules.length).toBe(0)
  })

  it('returns single rule', () => {
    const rules = getAllRules(makeConfig(['landmarks']))
    expect(rules.length).toBe(1)
    expect(rules[0].id).toBe('landmarks')
  })
})
