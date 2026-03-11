/** An RGBA color tuple: `[red, green, blue, alpha]` where RGB are 0-255 and alpha is 0-1. */
export type RGBA = [number, number, number, number]

/**
 * Parses any CSS color string into an {@link RGBA} tuple.
 *
 * Supported formats: named colors, `transparent`, hex (3/4/6/8 digit),
 * `rgb()`/`rgba()`, `hsl()`/`hsla()`, `oklch()`, `oklab()`.
 * Both legacy comma syntax and modern space-separated syntax are supported.
 *
 * @param color - A CSS color string (e.g. `'#ff0000'`, `'rgb(255 0 0 / 0.5)'`, `'rebeccapurple'`).
 * @returns An RGBA tuple with RGB values clamped to 0-255 and alpha to 0-1.
 * @throws If the color format is not recognized.
 */
export function parseColor(color: string): RGBA {
  const trimmed = color.trim().toLowerCase()

  if (trimmed === 'transparent') return [0, 0, 0, 0]

  const named = NAMED_COLORS[trimmed]
  if (named) return [named[0], named[1], named[2], 1]

  if (trimmed.startsWith('#')) return parseHex(trimmed)
  if (trimmed.startsWith('rgb')) return parseRgb(trimmed)
  if (trimmed.startsWith('hsl')) return parseHsl(trimmed)
  if (trimmed.startsWith('oklch')) return parseOklch(trimmed)
  if (trimmed.startsWith('oklab')) return parseOklab(trimmed)

  throw new Error(`Unsupported color format: ${color}`)
}

/**
 * Strips the alpha channel from an RGBA tuple, returning an RGB triple.
 *
 * @param color - An {@link RGBA} tuple.
 * @returns An `[r, g, b]` triple.
 */
export function toRGB(color: RGBA): [number, number, number] {
  return [color[0], color[1], color[2]]
}

/**
 * Composites a semi-transparent foreground color over a background using the
 * standard alpha compositing (Porter-Duff "source over") formula.
 *
 * @param fg - The foreground color (may be semi-transparent).
 * @param bg - The background color to composite over.
 * @returns The resulting opaque or semi-transparent RGBA color.
 */
export function compositeAlpha(fg: RGBA, bg: RGBA): RGBA {
  const [fgR, fgG, fgB, fgA] = fg
  const [bgR, bgG, bgB, bgA] = bg

  const outA = fgA + bgA * (1 - fgA)

  if (outA === 0) return [0, 0, 0, 0]

  return [
    Math.round((fgR * fgA + bgR * bgA * (1 - fgA)) / outA),
    Math.round((fgG * fgA + bgG * bgA * (1 - fgA)) / outA),
    Math.round((fgB * fgA + bgB * bgA * (1 - fgA)) / outA),
    outA,
  ]
}

// --- Parsers ---

function parseHex(hex: string): RGBA {
  const h = hex.slice(1)

  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
      1,
    ]
  }

  if (h.length === 4) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
      parseInt(h[3] + h[3], 16) / 255,
    ]
  }

  if (h.length === 6) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      1,
    ]
  }

  if (h.length === 8) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      parseInt(h.slice(6, 8), 16) / 255,
    ]
  }

  throw new Error(`Invalid hex color: ${hex}`)
}

function parseRgb(str: string): RGBA {
  // Handles both rgb(r, g, b) and rgba(r, g, b, a)
  // Also handles modern syntax: rgb(r g b / a)
  const inner = str.replace(/^rgba?\(/, '').replace(/\)$/, '')
  const parts = inner.split(/[,/]|\s+/).filter(Boolean)

  const r = parseColorComponent(parts[0], 255)
  const g = parseColorComponent(parts[1], 255)
  const b = parseColorComponent(parts[2], 255)
  const a = parts[3] !== undefined ? parseAlphaComponent(parts[3]) : 1

  return [Math.round(r), Math.round(g), Math.round(b), a]
}

function parseHsl(str: string): RGBA {
  const inner = str.replace(/^hsla?\(/, '').replace(/\)$/, '')
  const parts = inner.split(/[,/]|\s+/).filter(Boolean)

  const h = parseHueComponent(parts[0])
  const s = parsePercentage(parts[1])
  const l = parsePercentage(parts[2])
  const a = parts[3] !== undefined ? parseAlphaComponent(parts[3]) : 1

  const [r, g, b] = hslToRgb(h, s, l)
  return [r, g, b, a]
}

function parseOklch(str: string): RGBA {
  const inner = str.replace(/^oklch\(/, '').replace(/\)$/, '')
  const parts = inner.split(/[,/]|\s+/).filter(Boolean)

  const L = parsePercentageOrNumber(parts[0], 1)
  const C = parsePercentageOrNumber(parts[1], 0.4)
  const h = parseHueComponent(parts[2])
  const a = parts[3] !== undefined ? parseAlphaComponent(parts[3]) : 1

  const [r, g, b] = oklchToRgb(L, C, h)
  return [r, g, b, a]
}

function parseOklab(str: string): RGBA {
  const inner = str.replace(/^oklab\(/, '').replace(/\)$/, '')
  const parts = inner.split(/[,/]|\s+/).filter(Boolean)

  const L = parsePercentageOrNumber(parts[0], 1)
  const aLab = parsePercentageOrNumber(parts[1], 0.4, true)
  const bLab = parsePercentageOrNumber(parts[2], 0.4, true)
  const alpha = parts[3] !== undefined ? parseAlphaComponent(parts[3]) : 1

  const [r, g, b] = oklabToRgb(L, aLab, bLab)
  return [r, g, b, alpha]
}

// --- Component parsers ---

function parseColorComponent(s: string, max: number): number {
  s = s.trim()
  if (s.endsWith('%')) return (parseFloat(s) / 100) * max
  return clamp(parseFloat(s), 0, max)
}

function parseAlphaComponent(s: string): number {
  s = s.trim()
  if (s.endsWith('%')) return clamp(parseFloat(s) / 100, 0, 1)
  return clamp(parseFloat(s), 0, 1)
}

function parseHueComponent(s: string): number {
  s = s.trim()
  let deg = parseFloat(s)
  if (s.endsWith('grad')) deg = deg * (360 / 400)
  else if (s.endsWith('rad')) deg = deg * (180 / Math.PI)
  else if (s.endsWith('turn')) deg = deg * 360
  return ((deg % 360) + 360) % 360
}

function parsePercentage(s: string): number {
  return clamp(parseFloat(s) / 100, 0, 1)
}

function parsePercentageOrNumber(
  s: string,
  percentRef: number,
  allowNegative = false,
): number {
  s = s.trim()
  if (s.endsWith('%')) {
    const v = (parseFloat(s) / 100) * percentRef
    return allowNegative ? v : Math.max(0, v)
  }
  const v = parseFloat(s)
  return allowNegative ? v : Math.max(0, v)
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

// --- Color space conversions ---

function hslToRgb(
  h: number,
  s: number,
  l: number,
): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0,
    g = 0,
    b = 0

  if (h < 60) {
    r = c; g = x; b = 0
  } else if (h < 120) {
    r = x; g = c; b = 0
  } else if (h < 180) {
    r = 0; g = c; b = x
  } else if (h < 240) {
    r = 0; g = x; b = c
  } else if (h < 300) {
    r = x; g = 0; b = c
  } else {
    r = c; g = 0; b = x
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ]
}

function oklabToRgb(
  L: number,
  a: number,
  b: number,
): [number, number, number] {
  // OKLab -> linear sRGB via LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bOut = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  return [
    Math.round(clamp(linearToSrgb(r) * 255, 0, 255)),
    Math.round(clamp(linearToSrgb(g) * 255, 0, 255)),
    Math.round(clamp(linearToSrgb(bOut) * 255, 0, 255)),
  ]
}

function oklchToRgb(
  L: number,
  C: number,
  h: number,
): [number, number, number] {
  const hRad = (h * Math.PI) / 180
  const a = C * Math.cos(hRad)
  const b = C * Math.sin(hRad)
  return oklabToRgb(L, a, b)
}

function linearToSrgb(c: number): number {
  if (c <= 0.0031308) return 12.92 * c
  return 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

// --- Named colors (CSS Color Level 4) ---

const NAMED_COLORS: Record<string, [number, number, number]> = {
  aliceblue: [240, 248, 255],
  antiquewhite: [250, 235, 215],
  aqua: [0, 255, 255],
  aquamarine: [127, 255, 212],
  azure: [240, 255, 255],
  beige: [245, 245, 220],
  bisque: [255, 228, 196],
  black: [0, 0, 0],
  blanchedalmond: [255, 235, 205],
  blue: [0, 0, 255],
  blueviolet: [138, 43, 226],
  brown: [165, 42, 42],
  burlywood: [222, 184, 135],
  cadetblue: [95, 158, 160],
  chartreuse: [127, 255, 0],
  chocolate: [210, 105, 30],
  coral: [255, 127, 80],
  cornflowerblue: [100, 149, 237],
  cornsilk: [255, 248, 220],
  crimson: [220, 20, 60],
  cyan: [0, 255, 255],
  darkblue: [0, 0, 139],
  darkcyan: [0, 139, 139],
  darkgoldenrod: [184, 134, 11],
  darkgray: [169, 169, 169],
  darkgreen: [0, 100, 0],
  darkgrey: [169, 169, 169],
  darkkhaki: [189, 183, 107],
  darkmagenta: [139, 0, 139],
  darkolivegreen: [85, 107, 47],
  darkorange: [255, 140, 0],
  darkorchid: [153, 50, 204],
  darkred: [139, 0, 0],
  darksalmon: [233, 150, 122],
  darkseagreen: [143, 188, 143],
  darkslateblue: [72, 61, 139],
  darkslategray: [47, 79, 79],
  darkslategrey: [47, 79, 79],
  darkturquoise: [0, 206, 209],
  darkviolet: [148, 0, 211],
  deeppink: [255, 20, 147],
  deepskyblue: [0, 191, 255],
  dimgray: [105, 105, 105],
  dimgrey: [105, 105, 105],
  dodgerblue: [30, 144, 255],
  firebrick: [178, 34, 34],
  floralwhite: [255, 250, 240],
  forestgreen: [34, 139, 34],
  fuchsia: [255, 0, 255],
  gainsboro: [220, 220, 220],
  ghostwhite: [248, 248, 255],
  gold: [255, 215, 0],
  goldenrod: [218, 165, 32],
  gray: [128, 128, 128],
  green: [0, 128, 0],
  greenyellow: [173, 255, 47],
  grey: [128, 128, 128],
  honeydew: [240, 255, 240],
  hotpink: [255, 105, 180],
  indianred: [205, 92, 92],
  indigo: [75, 0, 130],
  ivory: [255, 255, 240],
  khaki: [240, 230, 140],
  lavender: [230, 230, 250],
  lavenderblush: [255, 240, 245],
  lawngreen: [124, 252, 0],
  lemonchiffon: [255, 250, 205],
  lightblue: [173, 216, 230],
  lightcoral: [240, 128, 128],
  lightcyan: [224, 255, 255],
  lightgoldenrodyellow: [250, 250, 210],
  lightgray: [211, 211, 211],
  lightgreen: [144, 238, 144],
  lightgrey: [211, 211, 211],
  lightpink: [255, 182, 193],
  lightsalmon: [255, 160, 122],
  lightseagreen: [32, 178, 170],
  lightskyblue: [135, 206, 250],
  lightslategray: [119, 136, 153],
  lightslategrey: [119, 136, 153],
  lightsteelblue: [176, 196, 222],
  lightyellow: [255, 255, 224],
  lime: [0, 255, 0],
  limegreen: [50, 205, 50],
  linen: [250, 240, 230],
  magenta: [255, 0, 255],
  maroon: [128, 0, 0],
  mediumaquamarine: [102, 205, 170],
  mediumblue: [0, 0, 205],
  mediumorchid: [186, 85, 211],
  mediumpurple: [147, 112, 219],
  mediumseagreen: [60, 179, 113],
  mediumslateblue: [123, 104, 238],
  mediumspringgreen: [0, 250, 154],
  mediumturquoise: [72, 209, 204],
  mediumvioletred: [199, 21, 133],
  midnightblue: [25, 25, 112],
  mintcream: [245, 255, 250],
  mistyrose: [255, 228, 225],
  moccasin: [255, 228, 181],
  navajowhite: [255, 222, 173],
  navy: [0, 0, 128],
  oldlace: [253, 245, 230],
  olive: [128, 128, 0],
  olivedrab: [107, 142, 35],
  orange: [255, 165, 0],
  orangered: [255, 69, 0],
  orchid: [218, 112, 214],
  palegoldenrod: [238, 232, 170],
  palegreen: [152, 251, 152],
  paleturquoise: [175, 238, 238],
  palevioletred: [219, 112, 147],
  papayawhip: [255, 239, 213],
  peachpuff: [255, 218, 185],
  peru: [205, 133, 63],
  pink: [255, 192, 203],
  plum: [221, 160, 221],
  powderblue: [176, 224, 230],
  purple: [128, 0, 128],
  rebeccapurple: [102, 51, 153],
  red: [255, 0, 0],
  rosybrown: [188, 143, 143],
  royalblue: [65, 105, 225],
  saddlebrown: [139, 69, 19],
  salmon: [250, 128, 114],
  sandybrown: [244, 164, 96],
  seagreen: [46, 139, 87],
  seashell: [255, 245, 238],
  sienna: [160, 82, 45],
  silver: [192, 192, 192],
  skyblue: [135, 206, 235],
  slateblue: [106, 90, 205],
  slategray: [112, 128, 144],
  slategrey: [112, 128, 144],
  snow: [255, 250, 250],
  springgreen: [0, 255, 127],
  steelblue: [70, 130, 180],
  tan: [210, 180, 140],
  teal: [0, 128, 128],
  thistle: [216, 191, 216],
  tomato: [255, 99, 71],
  turquoise: [64, 224, 208],
  violet: [238, 130, 238],
  wheat: [245, 222, 179],
  white: [255, 255, 255],
  whitesmoke: [245, 245, 245],
  yellow: [255, 255, 0],
  yellowgreen: [154, 205, 50],
}
