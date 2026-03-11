/** A serializable snapshot of the DOM state at a point in time. */
export interface DOMSnapshot {
  /** The full outer HTML of the document element. */
  html: string
  /** The page URL at the time of capture. */
  url: string
  /** Unix timestamp (ms) when the snapshot was taken. */
  timestamp: number
  /** Viewport dimensions, or `null` if captured outside a browser (e.g. Node.js). */
  viewport: { width: number; height: number } | null
}

/**
 * Captures a serializable snapshot of the current DOM state.
 *
 * Useful for recording the page state at audit time for later inspection or diffing.
 * Viewport is `null` when `window` is not available.
 *
 * @param root - The document to snapshot.
 * @returns A {@link DOMSnapshot} with HTML, URL, timestamp, and viewport info.
 */
export function captureSnapshot(root: Document): DOMSnapshot {
  const hasWindow = typeof window !== 'undefined'

  return {
    html: root.documentElement.outerHTML,
    url: root.location?.href ?? '',
    timestamp: Date.now(),
    viewport: hasWindow
      ? { width: window.innerWidth, height: window.innerHeight }
      : null,
  }
}
