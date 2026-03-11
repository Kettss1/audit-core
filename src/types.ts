/** Which contrast algorithm to use for evaluating text readability. */
export type ContrastAlgorithm = 'apca' | 'wcag'

/** Severity level of an accessibility violation, from most to least impactful. */
export type ImpactLevel = 'critical' | 'serious' | 'moderate' | 'minor'

/** Category a rule belongs to, used for grouping and filtering audit results. */
export type RuleCategory =
  | 'contrast'
  | 'structure'
  | 'semantics'
  | 'interaction'
  | 'motion'

/**
 * Result of a contrast evaluation between a text color and its background.
 *
 * Discriminated by `algorithm`:
 * - `'apca'` — `value` is the APCA Lc (lightness contrast) score.
 * - `'wcag'` — `value` is the WCAG 2.x contrast ratio (e.g. 4.5).
 */
export type ContrastResult =
  | { value: number; passes: boolean; algorithm: 'apca' }
  | { value: number; passes: boolean; algorithm: 'wcag' }

/** Configuration options passed to {@link createAuditor}. */
export interface AuditorConfig {
  /** Which contrast algorithm to use. Defaults to `'apca'`. */
  contrastAlgorithm: ContrastAlgorithm
  /** Run only these rule IDs. When `undefined`, all rules run. */
  rules?: string[]
  /** CSS selectors for elements to exclude from evaluation. */
  exclude?: string[]
}

/**
 * Environment capabilities detected at runtime.
 * Rules use these to decide whether they can run or should report `incomplete`.
 */
export interface Capabilities {
  /** Whether pseudo-class styles (`:focus`, `:hover`) can be programmatically triggered. */
  canEvaluatePseudoClasses: boolean
  /** Whether the environment provides real layout metrics (e.g. `getBoundingClientRect`). */
  hasRenderedLayout: boolean
}

/**
 * Fully resolved configuration combining user options with detected capabilities.
 * This is what rules receive during evaluation.
 */
export interface ResolvedConfig extends AuditorConfig {
  capabilities: Capabilities
}

/** A single DOM element that failed an accessibility rule. */
export interface ViolationNode {
  /** A CSS selector that uniquely identifies this element. */
  selector: string
  /** The outer HTML snippet of the element. */
  html: string
  /** Why this element fails the rule. */
  reason: string
  /** A recommended fix for this specific element. */
  suggestion: string
}

/** A single accessibility violation found during an audit. */
export interface Violation {
  /** The ID of the rule that found this violation (e.g. `'alt-text'`). */
  ruleId: string
  /** How severe this violation is. */
  impact: ImpactLevel
  /** Which category the rule belongs to. */
  category: RuleCategory
  /** Short human-readable title of the violation. */
  title: string
  /** Detailed explanation of why this is an accessibility issue. */
  description: string
  /** All DOM elements that triggered this violation. */
  nodes: ViolationNode[]
}

/** The complete result of running an accessibility audit. */
export interface AuditResult {
  /** All accessibility violations found. */
  violations: Violation[]
  /** Rule IDs that passed with no issues. */
  passes: string[]
  /** Rules that could not fully run (e.g. headless environment lacks layout). */
  incomplete: { ruleId: string; reason: string }[]
  /** Metadata about the audit run. */
  meta: {
    /** Which contrast algorithm was used. */
    algorithm: ContrastAlgorithm
    /** How many rules were evaluated. */
    rulesRun: number
    /** Unix timestamp (ms) when the audit completed. */
    timestamp: number
  }
}
