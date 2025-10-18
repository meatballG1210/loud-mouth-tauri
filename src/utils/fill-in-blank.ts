/**
 * Create a fill-in-the-blank version of a sentence by replacing a word with "___"
 * @param sentence The full sentence
 * @param word The word to replace with a blank
 * @returns The sentence with the word replaced by "___"
 */
export function createFillInBlank(sentence: string, word: string): string {
  if (!sentence || !word) {
    return sentence;
  }

  // Escape special regex characters in the word
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Create a regex to find the word (case-insensitive, whole word)
  // This will match the word with optional punctuation before/after
  const wordRegex = new RegExp(`\\b${escapedWord}\\b`, 'i');

  // Replace the first occurrence with "___"
  const result = sentence.replace(wordRegex, '___');

  return result;
}

/**
 * Split a sentence into parts for inline fill-in-the-blank
 * @param sentence The full sentence
 * @param word The word to replace with a blank
 * @returns Object with before, after parts and the word length
 */
export function splitSentenceForBlank(sentence: string, word: string): {
  before: string;
  after: string;
  wordLength: number;
} {
  if (!sentence || !word) {
    return { before: sentence, after: '', wordLength: 0 };
  }

  // Escape special regex characters in the word
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Create a regex to find the word (case-insensitive, whole word)
  const wordRegex = new RegExp(`\\b${escapedWord}\\b`, 'i');

  // Find the match
  const match = sentence.match(wordRegex);

  if (!match) {
    return { before: sentence, after: '', wordLength: word.length };
  }

  const index = match.index!;
  const before = sentence.substring(0, index);
  const after = sentence.substring(index + match[0].length);

  return {
    before,
    after,
    wordLength: match[0].length,
  };
}

/**
 * Check if the user's answer matches the correct word
 * Uses exact match with normalization (case-insensitive, trimmed, no punctuation)
 * @param userAnswer The user's answer
 * @param correctWord The correct word
 * @returns True if the answers match
 */
export function checkWordMatch(userAnswer: string, correctWord: string): boolean {
  if (!userAnswer || !correctWord) {
    return false;
  }

  // Normalize both strings: lowercase, trim, remove punctuation
  const normalize = (str: string): string => {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')     // Normalize spaces
      .trim();
  };

  const normalizedAnswer = normalize(userAnswer);
  const normalizedCorrect = normalize(correctWord);

  return normalizedAnswer === normalizedCorrect;
}
