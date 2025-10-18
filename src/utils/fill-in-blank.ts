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
