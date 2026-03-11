declare module 'apca-w3' {
  export function APCAcontrast(txtY: number, bgY: number, places?: number): number
  export function sRGBtoY(rgb: [number, number, number]): number
  export function fontLookupAPCA(
    contrast: number,
    places?: number,
  ): [string, ...number[]]
  export function alphaBlend(
    rgbaFG: number[],
    rgbBG: number[],
    round?: boolean,
  ): number[]
}
