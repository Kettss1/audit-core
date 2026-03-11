import { describe, it, expect } from 'vitest'
import { evaluateAPCA } from '../../src/algorithms/apca'

describe('evaluateAPCA', () => {
  it('returns high contrast for black on white', () => {
    const result = evaluateAPCA('rgb(0, 0, 0)', 'rgb(255, 255, 255)', 16, 400)
    expect(result.algorithm).toBe('apca')
    expect(result.value).toBeGreaterThan(100)
    expect(result.passes).toBe(true)
  })

  it('returns 0 contrast for same color', () => {
    const result = evaluateAPCA(
      'rgb(128, 128, 128)',
      'rgb(128, 128, 128)',
      16,
      400,
    )
    expect(result.value).toBeCloseTo(0, 0)
    expect(result.passes).toBe(false)
  })

  it('fails small light text on slightly lighter background', () => {
    // Low contrast — light gray on white
    const result = evaluateAPCA(
      'rgb(200, 200, 200)',
      'rgb(255, 255, 255)',
      12,
      400,
    )
    expect(result.passes).toBe(false)
  })

  it('passes large bold text with moderate contrast', () => {
    // Dark gray on white, large bold text
    const result = evaluateAPCA(
      'rgb(100, 100, 100)',
      'rgb(255, 255, 255)',
      24,
      700,
    )
    expect(result.passes).toBe(true)
  })

  it('works with named colors', () => {
    const result = evaluateAPCA('black', 'white', 16, 400)
    expect(result.value).toBeGreaterThan(100)
  })
})
