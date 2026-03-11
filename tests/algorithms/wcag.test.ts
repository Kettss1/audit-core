import { describe, it, expect } from 'vitest'
import { evaluateWCAG } from '../../src/algorithms/wcag'

describe('evaluateWCAG', () => {
  it('reports maximum contrast for black on white', () => {
    const result = evaluateWCAG('rgb(0, 0, 0)', 'rgb(255, 255, 255)', false)
    expect(result.algorithm).toBe('wcag')
    expect(result.value).toBeCloseTo(21, 0)
    expect(result.passes).toBe(true)
  })

  it('reports 1:1 for same color', () => {
    const result = evaluateWCAG('rgb(128, 128, 128)', 'rgb(128, 128, 128)', false)
    expect(result.value).toBeCloseTo(1, 1)
    expect(result.passes).toBe(false)
  })

  it('passes normal text at 4.5:1', () => {
    // gray on white — ratio ~4.6:1
    const result = evaluateWCAG('rgb(118, 118, 118)', 'rgb(255, 255, 255)', false)
    expect(result.value).toBeGreaterThanOrEqual(4.5)
    expect(result.passes).toBe(true)
  })

  it('fails normal text below 4.5:1', () => {
    // light gray on white — ratio ~3:1
    const result = evaluateWCAG('rgb(150, 150, 150)', 'rgb(255, 255, 255)', false)
    expect(result.value).toBeLessThan(4.5)
    expect(result.passes).toBe(false)
  })

  it('uses 3:1 threshold for large text', () => {
    // rgb(145,145,145) on white ≈ 3.1:1
    const result = evaluateWCAG('rgb(145, 145, 145)', 'rgb(255, 255, 255)', true)
    expect(result.value).toBeGreaterThanOrEqual(3)
    expect(result.passes).toBe(true)
  })

  it('works with hex colors', () => {
    const result = evaluateWCAG('#000000', '#ffffff', false)
    expect(result.value).toBeCloseTo(21, 0)
    expect(result.passes).toBe(true)
  })

  it('works with named colors', () => {
    const result = evaluateWCAG('black', 'white', false)
    expect(result.value).toBeCloseTo(21, 0)
  })
})
