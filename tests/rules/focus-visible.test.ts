import { describe, it, expect, beforeEach } from 'vitest'
import { focusVisibleRule } from '../../src/rules/focus-visible'
import { ResolvedConfig } from '../../src/types'
import { EvaluationContext } from '../../src/rules'

function makeConfig(canEval = true): ResolvedConfig {
  return {
    contrastAlgorithm: 'apca',
    exclude: [],
    capabilities: {
      canEvaluatePseudoClasses: canEval,
      hasRenderedLayout: true,
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

describe('focus-visible rule', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    // Clean up any injected styles
    document.querySelectorAll('style[data-test]').forEach((s) => s.remove())
  })

  it('returns incomplete in headless context', async () => {
    const ctx = setup('<button>Click</button>')
    const result = await focusVisibleRule.evaluate(ctx, makeConfig(false))
    expect(result.status).toBe('incomplete')
    if (result.status === 'incomplete') {
      expect(result.reason).toContain('headless')
    }
  })

  it('passes for elements with default browser focus styles', async () => {
    const ctx = setup('<button>Click me</button>')
    const result = await focusVisibleRule.evaluate(ctx, makeConfig())
    // Browsers provide default focus outlines
    expect(result.status).toBe('pass')
  })

  it('flags elements with outline: none and no replacement', async () => {
    const style = document.createElement('style')
    style.setAttribute('data-test', '')
    style.textContent = `
      .no-focus:focus { outline: none; }
      .no-focus:focus-visible { outline: none; }
    `
    document.head.appendChild(style)

    const ctx = setup('<button class="no-focus">No focus ring</button>')
    const result = await focusVisibleRule.evaluate(ctx, makeConfig())
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.nodes[0].reason).toContain('no visible focus indicator')
    }
  })

  it('passes when outline is removed but box-shadow replaces it', async () => {
    const style = document.createElement('style')
    style.setAttribute('data-test', '')
    style.textContent = `
      .shadow-focus:focus { outline: none; box-shadow: 0 0 0 3px blue; }
    `
    document.head.appendChild(style)

    const ctx = setup('<button class="shadow-focus">Shadow focus</button>')
    const result = await focusVisibleRule.evaluate(ctx, makeConfig())
    expect(result.status).toBe('pass')
  })

  it('passes when outline is removed but border replaces it', async () => {
    const style = document.createElement('style')
    style.setAttribute('data-test', '')
    style.textContent = `
      .border-focus { border: 2px solid transparent; }
      .border-focus:focus { outline: none; border-color: blue; }
    `
    document.head.appendChild(style)

    const ctx = setup('<button class="border-focus">Border focus</button>')
    const result = await focusVisibleRule.evaluate(ctx, makeConfig())
    expect(result.status).toBe('pass')
  })

  it('checks links with href', async () => {
    const style = document.createElement('style')
    style.setAttribute('data-test', '')
    style.textContent = `
      .no-focus:focus { outline: none; }
      .no-focus:focus-visible { outline: none; }
    `
    document.head.appendChild(style)

    const ctx = setup('<a href="#" class="no-focus">Link</a>')
    const result = await focusVisibleRule.evaluate(ctx, makeConfig())
    expect(result.status).toBe('violation')
  })

  it('skips hidden elements', async () => {
    const ctx = setup(
      '<button style="display: none;">Hidden</button>',
    )
    const result = await focusVisibleRule.evaluate(ctx, makeConfig())
    expect(result.status).toBe('pass')
  })

  it('checks elements with tabindex', async () => {
    const style = document.createElement('style')
    style.setAttribute('data-test', '')
    style.textContent = `
      .custom-focus:focus { outline: none; }
      .custom-focus:focus-visible { outline: none; }
    `
    document.head.appendChild(style)

    const ctx = setup('<div tabindex="0" class="custom-focus">Focusable</div>')
    const result = await focusVisibleRule.evaluate(ctx, makeConfig())
    expect(result.status).toBe('violation')
  })

  it('ignores elements with tabindex="-1"', async () => {
    const ctx = setup('<div tabindex="-1">Not tabbable</div>')
    const result = await focusVisibleRule.evaluate(ctx, makeConfig())
    expect(result.status).toBe('pass')
  })
})
