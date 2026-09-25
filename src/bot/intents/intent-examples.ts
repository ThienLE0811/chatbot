/**
 * An intent's examples live in the `nlu` collection, the one Rasa trains on;
 * the intents page reads and writes them there so there is a single copy.
 */

/** Case-insensitive key two examples are compared by. */
export function exampleKey(example: string): string {
  return example.trim().toLowerCase();
}

/** Trimmed, without blanks or repeats (the first spelling is kept). */
export function cleanExamples(examples: unknown[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of examples) {
    const example = typeof raw === 'string' ? raw.trim() : '';
    const key = exampleKey(example);
    if (!example || seen.has(key)) continue;
    seen.add(key);
    cleaned.push(example);
  }
  return cleaned;
}

/** `current` followed by the examples of `extra` it does not have yet. */
export function mergeExamples(current: string[], extra: string[]): string[] {
  return cleanExamples([...current, ...extra]);
}

export interface ExampleConflict {
  example: string;
  intent: string;
}

/**
 * Examples already used by another intent: the model could not tell the two
 * intents apart, so saving them is refused.
 */
export function findConflicts(
  examples: string[],
  others: { intent: string; examples?: unknown[] }[],
): ExampleConflict[] {
  const owners = new Map<string, string>();
  for (const other of others) {
    for (const example of cleanExamples(other.examples ?? [])) {
      owners.set(exampleKey(example), other.intent);
    }
  }
  return examples
    .filter((example) => owners.has(exampleKey(example)))
    .map((example) => ({
      example,
      intent: owners.get(exampleKey(example)),
    }));
}

export function describeConflicts(conflicts: ExampleConflict[]): string {
  const shown = conflicts
    .slice(0, 3)
    .map(({ example, intent }) => `"${example}" (ý định "${intent}")`)
    .join(', ');
  const more =
    conflicts.length > 3 ? ` và ${conflicts.length - 3} câu khác` : '';
  return `Câu mẫu đã thuộc ý định khác: ${shown}${more}`;
}
