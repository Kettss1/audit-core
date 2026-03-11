import { Rule, RuleResult, EvaluationContext } from './index'
import { ResolvedConfig, ViolationNode } from '../types'

const FILENAME_PATTERN = /\.\w{2,4}$/
const PLACEHOLDER_PATTERN =
  /^(image|photo|picture|icon|logo|graphic|banner|placeholder|untitled|img|screenshot)$/i

export const altTextRule: Rule = {
  id: 'alt-text',
  async evaluate(
    context: EvaluationContext,
    _config: ResolvedConfig,
  ): Promise<RuleResult> {
    const nodes: ViolationNode[] = []
    const incompleteReasons: string[] = []

    for (const el of context.candidates) {
      if (el instanceof HTMLImageElement) {
        checkImg(el, nodes, incompleteReasons)
      } else if (
        el.getAttribute('role') === 'img' &&
        !(el instanceof HTMLImageElement)
      ) {
        checkRoleImg(el, nodes)
      } else if (el instanceof SVGSVGElement) {
        checkSvg(el, nodes)
      }
    }

    if (incompleteReasons.length > 0 && nodes.length === 0) {
      return { status: 'incomplete', reason: incompleteReasons[0] }
    }

    if (nodes.length === 0) return { status: 'pass' }

    return {
      status: 'violation',
      violation: {
        ruleId: 'alt-text',
        impact: 'critical',
        category: 'semantics',
        title: 'Images missing accessible alternative text',
        description:
          'Image elements must have meaningful alt text or be marked as decorative',
        nodes,
      },
    }
  },
}

function checkImg(
  el: HTMLImageElement,
  nodes: ViolationNode[],
  incomplete: string[],
): void {
  // alt="" is valid — marks the image as decorative
  if (el.hasAttribute('alt') && el.alt === '') return

  if (!el.hasAttribute('alt')) {
    nodes.push({
      selector: getSelector(el),
      html: truncateHtml(el.outerHTML),
      reason: 'Image is missing the alt attribute entirely',
      suggestion: 'Add an alt attribute describing the image, or alt="" if decorative',
    })
    return
  }

  const alt = el.alt.trim()

  if (FILENAME_PATTERN.test(alt)) {
    nodes.push({
      selector: getSelector(el),
      html: truncateHtml(el.outerHTML),
      reason: `Alt text "${alt}" appears to be a filename`,
      suggestion: 'Replace with a meaningful description of the image content',
    })
    return
  }

  if (PLACEHOLDER_PATTERN.test(alt)) {
    nodes.push({
      selector: getSelector(el),
      html: truncateHtml(el.outerHTML),
      reason: `Alt text "${alt}" is a generic placeholder`,
      suggestion: 'Replace with a description of what the image shows',
    })
    return
  }

  if (alt.length === 1) {
    nodes.push({
      selector: getSelector(el),
      html: truncateHtml(el.outerHTML),
      reason: 'Alt text is a single character',
      suggestion: 'Provide a meaningful description of the image',
    })
    return
  }

  // Suspiciously short — flag for manual review
  if (alt.length > 0 && alt.length <= 5) {
    incomplete.push(
      `Image alt text "${alt}" is very short and may not be descriptive enough`,
    )
  }
}

function checkRoleImg(el: Element, nodes: ViolationNode[]): void {
  const ariaLabel = el.getAttribute('aria-label')?.trim()
  const ariaLabelledBy = el.getAttribute('aria-labelledby')

  if (ariaLabel) return
  if (ariaLabelledBy) {
    const refEl = el.ownerDocument.getElementById(ariaLabelledBy)
    if (refEl && refEl.textContent?.trim()) return
  }

  nodes.push({
    selector: getSelector(el),
    html: truncateHtml(el.outerHTML),
    reason: 'Element with role="img" has no accessible name',
    suggestion: 'Add aria-label or aria-labelledby attribute',
  })
}

function checkSvg(el: SVGSVGElement, nodes: ViolationNode[]): void {
  const title = el.querySelector('title')
  if (title && title.textContent?.trim()) return

  const ariaLabel = el.getAttribute('aria-label')?.trim()
  if (ariaLabel) return

  const ariaLabelledBy = el.getAttribute('aria-labelledby')
  if (ariaLabelledBy) {
    const refEl = el.ownerDocument.getElementById(ariaLabelledBy)
    if (refEl && refEl.textContent?.trim()) return
  }

  // Check if it's decorative
  if (el.getAttribute('aria-hidden') === 'true') return
  if (el.getAttribute('role') === 'presentation') return
  if (el.getAttribute('role') === 'none') return

  nodes.push({
    selector: getSelector(el),
    html: truncateHtml(el.outerHTML),
    reason: 'SVG has no accessible name',
    suggestion:
      'Add a <title> child element, aria-label, or mark as decorative with aria-hidden="true"',
  })
}

function getSelector(el: Element): string {
  if (el.id) return `#${el.id}`
  const tag = el.tagName.toLowerCase()
  const cls =
    el.className && typeof el.className === 'string'
      ? `.${el.className.trim().split(/\s+/)[0]}`
      : ''
  return tag + cls
}

function truncateHtml(html: string, maxLength = 200): string {
  if (html.length <= maxLength) return html
  return html.slice(0, maxLength) + '...'
}
