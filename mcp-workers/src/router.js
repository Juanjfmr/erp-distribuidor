// Classifies task complexity to guide future model routing
// Currently all tasks go to MiniMax M3 — extend here when adding cheaper/faster models

const SIMPLE_PATTERNS = [
  /\bformat\b/i,
  /\brename\b/i,
  /\bextract\b/i,
  /\blist\b/i,
  /\bcount\b/i,
  /\bconvert\b/i,
  /\btranslate\b/i,
  /\bclean\b/i,
];

const COMPLEX_PATTERNS = [
  /\barchitect\b/i,
  /\bdesign\b/i,
  /\bdecide\b/i,
  /\bstrategy\b/i,
  /\bsecurity\b/i,
  /\bperformance\b/i,
];

/**
 * Returns 'simple' | 'medium' | 'complex'
 * Used by execute_task to attach metadata to requests.
 * Routing logic can be expanded here to select cheaper models for simpler tasks.
 */
export function routeTask(task) {
  if (SIMPLE_PATTERNS.some(p => p.test(task))) return 'simple';
  if (COMPLEX_PATTERNS.some(p => p.test(task))) return 'complex';
  return 'medium';
}
