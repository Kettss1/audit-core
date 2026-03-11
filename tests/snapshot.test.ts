import { describe, it, expect } from 'vitest'
import { captureSnapshot } from '../src/snapshot'

describe('captureSnapshot', () => {
  it('captures the full document HTML', () => {
    document.body.innerHTML = '<p>Hello world</p>'
    const snapshot = captureSnapshot(document)

    expect(snapshot.html).toContain('<p>Hello world</p>')
    expect(snapshot.html).toContain('<html')
  })

  it('captures the URL', () => {
    const snapshot = captureSnapshot(document)
    expect(typeof snapshot.url).toBe('string')
  })

  it('captures a timestamp', () => {
    const before = Date.now()
    const snapshot = captureSnapshot(document)
    const after = Date.now()

    expect(snapshot.timestamp).toBeGreaterThanOrEqual(before)
    expect(snapshot.timestamp).toBeLessThanOrEqual(after)
  })

  it('captures viewport dimensions in browser context', () => {
    const snapshot = captureSnapshot(document)

    expect(snapshot.viewport).not.toBeNull()
    expect(snapshot.viewport!.width).toBeGreaterThan(0)
    expect(snapshot.viewport!.height).toBeGreaterThan(0)
  })
})
