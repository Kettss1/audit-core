import { describe, it, expect, beforeEach } from 'vitest'
import { motionRule } from '../../src/rules/motion'
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

describe('motion rule', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.querySelectorAll('style[data-test]').forEach((s) => s.remove())
  })

  it('passes when no animations exist', async () => {
    const ctx = setup('<div>Static content</div>')
    const result = await motionRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('flags elements with animations but no reduced-motion query', async () => {
    const style = document.createElement('style')
    style.setAttribute('data-test', '')
    style.textContent = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .spinner { animation: spin 2s linear infinite; }
    `
    document.head.appendChild(style)

    const ctx = setup('<div class="spinner">Loading</div>')
    const result = await motionRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.nodes[0].reason).toContain('animation')
      expect(result.violation.nodes[0].reason).toContain('prefers-reduced-motion')
    }
  })

  it('passes when reduced-motion query exists', async () => {
    const style = document.createElement('style')
    style.setAttribute('data-test', '')
    style.textContent = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .spinner { animation: spin 2s linear infinite; }
      @media (prefers-reduced-motion: reduce) {
        .spinner { animation: none; }
      }
    `
    document.head.appendChild(style)

    const ctx = setup('<div class="spinner">Loading</div>')
    const result = await motionRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('flags autoplay video', async () => {
    const ctx = setup('<video autoplay src="video.mp4"></video>')
    const result = await motionRule.evaluate(ctx, config)
    expect(result.status).toBe('violation')
    if (result.status === 'violation') {
      expect(result.violation.nodes[0].reason).toContain('autoplay')
    }
  })

  it('passes for video without autoplay', async () => {
    const ctx = setup('<video src="video.mp4"></video>')
    const result = await motionRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('ignores elements with animation-name: none', async () => {
    const style = document.createElement('style')
    style.setAttribute('data-test', '')
    style.textContent = `
      .static { animation-name: none; animation-duration: 2s; }
    `
    document.head.appendChild(style)

    const ctx = setup('<div class="static">No animation</div>')
    const result = await motionRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })

  it('ignores transitions with 0s duration', async () => {
    const style = document.createElement('style')
    style.setAttribute('data-test', '')
    style.textContent = `
      .no-transition { transition-property: color; transition-duration: 0s; }
    `
    document.head.appendChild(style)

    const ctx = setup('<div class="no-transition">No transition</div>')
    const result = await motionRule.evaluate(ctx, config)
    expect(result.status).toBe('pass')
  })
})
