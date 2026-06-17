// Classifies task complexity — metadata for logging and future model routing.
// To route simple tasks to a cheaper model, add the logic in WorkerPool.execute()
// using the complexity value passed from here.

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

/** Returns 'simple' | 'medium' | 'complex' */
export function routeTask(task) {
  if (SIMPLE_PATTERNS.some(p => p.test(task))) return 'simple';
  if (COMPLEX_PATTERNS.some(p => p.test(task))) return 'complex';
  return 'medium';
}
