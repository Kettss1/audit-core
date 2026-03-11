import { ResolvedConfig, Violation } from '../types'

/**
 * The outcome of evaluating a single accessibility rule.
 *
 * Discriminated by `status`:
 * - `'pass'` — The rule found no issues.
 * - `'incomplete'` — The rule could not fully run (e.g. missing layout engine). Includes a `reason`.
 * - `'violation'` — The rule found accessibility issues. Includes the full {@link Violation}.
 */
export type RuleResult =
  | { status: 'pass' }
  | { status: 'incomplete'; reason: string }
  | { status: 'violation'; violation: Violation }

/**
 * Context passed to every rule during evaluation.
 *
 * Rules should use `candidates` for the elements they inspect (respects exclude config),
 * and `root` when they need full-document context (e.g. heading hierarchy, landmarks).
 */
export interface EvaluationContext {
  /** The root element or document to query against for full-page context. */
  root: Element | Document
  /** Pre-filtered list of elements to evaluate (excludes user-specified selectors). */
  candidates: Element[]
}

/** An accessibility rule that can be evaluated against a DOM tree. */
export interface Rule {
  /** Unique identifier for this rule (e.g. `'alt-text'`, `'contrast'`). */
  id: string
  /** Runs the rule against the given context and returns the result. */
  evaluate: (
    context: EvaluationContext,
    config: ResolvedConfig,
  ) => Promise<RuleResult>
}

import { contrastRule } from './contrast'
import { altTextRule } from './alt-text'
import { formLabelsRule } from './form-labels'
import { headingHierarchyRule } from './heading-hierarchy'
import { landmarksRule } from './landmarks'
import { focusVisibleRule } from './focus-visible'
import { touchTargetRule } from './touch-target'
import { motionRule } from './motion'

const ALL_RULES: Rule[] = [
  contrastRule,
  altTextRule,
  formLabelsRule,
  headingHierarchyRule,
  landmarksRule,
  focusVisibleRule,
  touchTargetRule,
  motionRule,
]

/**
 * Returns the rules to run based on the configuration.
 *
 * If `config.rules` is undefined, all 8 built-in rules are returned.
 * Otherwise, only rules whose IDs are in `config.rules` are included.
 *
 * @param config - The resolved configuration with optional rule filter.
 * @returns An array of {@link Rule} objects to evaluate.
 */
export function getAllRules(config: ResolvedConfig): Rule[] {
  if (!config.rules) return ALL_RULES
  return ALL_RULES.filter((rule) => config.rules!.includes(rule.id))
}
