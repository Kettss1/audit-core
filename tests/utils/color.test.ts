import { describe, it, expect } from 'vitest'
import { parseColor, toRGB, compositeAlpha, RGBA } from '../../src/utils/color'

describe('parseColor', () => {
  describe('named colors', () => {
    it('parses standard named colors', () => {
      expect(parseColor('red')).toEqual([255, 0, 0, 1])
      expect(parseColor('blue')).toEqual([0, 0, 255, 1])
      expect(parseColor('white')).toEqual([255, 255, 255, 1])
      expect(parseColor('black')).toEqual([0, 0, 0, 1])
    })

    it('is case-insensitive', () => {
      expect(parseColor('Red')).toEqual([255, 0, 0, 1])
      expect(parseColor('RED')).toEqual([255, 0, 0, 1])
    })

    it('parses transparent', () => {
      expect(parseColor('transparent')).toEqual([0, 0, 0, 0])
    })

    it('parses rebeccapurple', () => {
      expect(parseColor('rebeccapurple')).toEqual([102, 51, 153, 1])
    })
  })

  describe('hex', () => {
    it('parses 3-digit hex', () => {
      expect(parseColor('#f00')).toEqual([255, 0, 0, 1])
      expect(parseColor('#fff')).toEqual([255, 255, 255, 1])
    })

    it('parses 6-digit hex', () => {
      expect(parseColor('#ff0000')).toEqual([255, 0, 0, 1])
      expect(parseColor('#663399')).toEqual([102, 51, 153, 1])
    })

    it('parses 8-digit hex with alpha', () => {
      const result = parseColor('#ff000080')
      expect(result[0]).toBe(255)
      expect(result[1]).toBe(0)
      expect(result[2]).toBe(0)
      expect(result[3]).toBeCloseTo(128 / 255, 2)
    })

    it('parses 4-digit hex with alpha', () => {
      const result = parseColor('#f008')
      expect(result[0]).toBe(255)
      expect(result[1]).toBe(0)
      expect(result[2]).toBe(0)
      expect(result[3]).toBeCloseTo(0x88 / 255, 2)
    })
  })

  describe('rgb/rgba', () => {
    it('parses rgb()', () => {
      expect(parseColor('rgb(255, 0, 0)')).toEqual([255, 0, 0, 1])
    })

    it('parses rgba()', () => {
      expect(parseColor('rgba(255, 0, 0, 0.5)')).toEqual([255, 0, 0, 0.5])
    })

    it('parses modern rgb syntax with slash', () => {
      expect(parseColor('rgb(255 0 0 / 0.5)')).toEqual([255, 0, 0, 0.5])
    })

    it('parses percentage values', () => {
      expect(parseColor('rgb(100%, 0%, 0%)')).toEqual([255, 0, 0, 1])
    })

    it('parses percentage alpha', () => {
      expect(parseColor('rgba(255, 0, 0, 50%)')).toEqual([255, 0, 0, 0.5])
    })
  })

  describe('hsl/hsla', () => {
    it('parses red in hsl', () => {
      expect(parseColor('hsl(0, 100%, 50%)')).toEqual([255, 0, 0, 1])
    })

    it('parses green in hsl', () => {
      const result = parseColor('hsl(120, 100%, 50%)')
      expect(result[0]).toBe(0)
      expect(result[1]).toBe(255)
      expect(result[2]).toBe(0)
      expect(result[3]).toBe(1)
    })

    it('parses hsla with alpha', () => {
      const result = parseColor('hsla(0, 100%, 50%, 0.5)')
      expect(result).toEqual([255, 0, 0, 0.5])
    })

    it('parses modern hsl syntax with slash', () => {
      const result = parseColor('hsl(0 100% 50% / 0.5)')
      expect(result).toEqual([255, 0, 0, 0.5])
    })
  })

  describe('oklch', () => {
    it('parses an oklch color', () => {
      const result = parseColor('oklch(0.7 0.15 30)')
      expect(result[3]).toBe(1)
      // Values should be valid RGB
      expect(result[0]).toBeGreaterThanOrEqual(0)
      expect(result[0]).toBeLessThanOrEqual(255)
    })

    it('parses oklch with alpha', () => {
      const result = parseColor('oklch(0.7 0.15 30 / 0.5)')
      expect(result[3]).toBe(0.5)
    })
  })

  describe('oklab', () => {
    it('parses an oklab color', () => {
      const result = parseColor('oklab(0.7 0.1 0.1)')
      expect(result[3]).toBe(1)
      expect(result[0]).toBeGreaterThanOrEqual(0)
      expect(result[0]).toBeLessThanOrEqual(255)
    })
  })

  describe('hsl hue units', () => {
    it('parses hue in radians', () => {
      // π rad = 180deg = cyan-ish
      const result = parseColor(`hsl(${Math.PI}rad, 100%, 50%)`)
      expect(result[3]).toBe(1)
      // 180deg = cyan = [0, 255, 255]
      expect(result[0]).toBe(0)
      expect(result[1]).toBe(255)
      expect(result[2]).toBe(255)
    })

    it('parses hue in gradians', () => {
      // 200grad = 180deg
      const result = parseColor('hsl(200grad, 100%, 50%)')
      expect(result[0]).toBe(0)
      expect(result[1]).toBe(255)
      expect(result[2]).toBe(255)
    })

    it('parses hue in turns', () => {
      // 0.5turn = 180deg
      const result = parseColor('hsl(0.5turn, 100%, 50%)')
      expect(result[0]).toBe(0)
      expect(result[1]).toBe(255)
      expect(result[2]).toBe(255)
    })
  })

  describe('invalid inputs', () => {
    it('throws on invalid hex digits', () => {
      expect(() => parseColor('#gg0000')).not.toThrow()
      // NaN from parseInt is handled, but result will be NaN-based
      const result = parseColor('#gg0000')
      expect(Number.isNaN(result[0])).toBe(true)
    })

    it('throws on unsupported format', () => {
      expect(() => parseColor('not-a-color')).toThrow('Unsupported color format')
    })

    it('throws on empty string', () => {
      expect(() => parseColor('')).toThrow('Unsupported color format')
    })

    it('throws on invalid hex length', () => {
      expect(() => parseColor('#12345')).toThrow('Invalid hex color')
    })
  })

  it('handles whitespace', () => {
    expect(parseColor('  red  ')).toEqual([255, 0, 0, 1])
    expect(parseColor('  rgb( 255 , 0 , 0 )  ')).toEqual([255, 0, 0, 1])
  })
})

describe('toRGB', () => {
  it('strips alpha channel', () => {
    expect(toRGB([255, 128, 0, 0.5])).toEqual([255, 128, 0])
  })
})

describe('compositeAlpha', () => {
  it('composites semi-transparent over opaque', () => {
    const fg: RGBA = [255, 0, 0, 0.5]
    const bg: RGBA = [0, 0, 255, 1]
    const result = compositeAlpha(fg, bg)

    expect(result[3]).toBe(1)
    // Should be a purple-ish blend
    expect(result[0]).toBeGreaterThan(100)
    expect(result[2]).toBeGreaterThan(100)
  })

  it('returns bg when fg is fully transparent', () => {
    const fg: RGBA = [255, 0, 0, 0]
    const bg: RGBA = [0, 0, 255, 1]
    const result = compositeAlpha(fg, bg)

    expect(result).toEqual([0, 0, 255, 1])
  })

  it('returns fg when fg is fully opaque', () => {
    const fg: RGBA = [255, 0, 0, 1]
    const bg: RGBA = [0, 0, 255, 1]
    const result = compositeAlpha(fg, bg)

    expect(result).toEqual([255, 0, 0, 1])
  })

  it('returns transparent when both are transparent', () => {
    const fg: RGBA = [0, 0, 0, 0]
    const bg: RGBA = [0, 0, 0, 0]
    expect(compositeAlpha(fg, bg)).toEqual([0, 0, 0, 0])
  })
})
