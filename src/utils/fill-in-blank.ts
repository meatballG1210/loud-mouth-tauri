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

// ============================================
// Multi-word phrase support (with discontinuous phrase handling)
// ============================================

/**
 * Represents a single blank in a multi-word phrase
 */
export interface WordBlank {
  word: string;           // The correct word for this blank
  beforeSegment: string;  // Text segment before this blank (includes prefix for partial matches)
  afterSegment?: string;  // Suffix after partial match (e.g., "s" for "underpants" -> "under[___]s")
  index: number;          // Position in the phrase (0, 1, 2...)
  isPartialMatch: boolean; // True if this was a partial (substring) match
}

/**
 * Result of splitting a sentence for multi-word blanks
 */
export interface MultiWordBlankResult {
  blanks: WordBlank[];    // Array of blanks, one per word
  afterSegment: string;   // Text after the last blank
  isMultiWord: boolean;   // True if phrase has 2+ words
  totalWords: number;     // Number of words in phrase
}

/**
 * Result of finding a word match in text
 */
interface MatchResult {
  startInSearchText: number;  // Where the match starts in the search text
  prefixLength: number;       // Length of prefix before the word (for partial matches)
  suffix: string;             // Suffix after the word (for partial matches)
  totalMatchLength: number;   // Total length consumed (including prefix + word + suffix)
  isPartial: boolean;         // Whether this is a partial match
  matchedWord: string;        // The actual matched text
}

/**
 * Split a phrase into individual words
 * @param phrase The phrase to split
 * @returns Array of words
 */
export function splitPhraseIntoWords(phrase: string): string[] {
  return phrase.trim().split(/\s+/).filter(Boolean);
}

/**
 * Check if a character is part of a word (alphanumeric or apostrophe for contractions)
 */
function isWordChar(char: string): boolean {
  return /[\w']/.test(char);
}

/**
 * Find the start of the word containing the given position
 */
function findWordStart(text: string, pos: number): number {
  while (pos > 0 && isWordChar(text[pos - 1])) {
    pos--;
  }
  return pos;
}

/**
 * Find the end of the word containing the given position
 */
function findWordEnd(text: string, pos: number): number {
  while (pos < text.length && isWordChar(text[pos])) {
    pos++;
  }
  return pos;
}

/**
 * Try to find a whole word match (word boundaries on both sides)
 */
function findWholeWordMatch(text: string, word: string): MatchResult | null {
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
  const match = text.match(regex);

  if (!match) {
    return null;
  }

  return {
    startInSearchText: match.index!,
    prefixLength: 0,
    suffix: '',
    totalMatchLength: match[0].length,
    isPartial: false,
    matchedWord: match[0]
  };
}

/**
 * Try to find a partial (substring) match within a larger word
 */
function findPartialMatch(text: string, word: string): MatchResult | null {
  const lowerText = text.toLowerCase();
  const lowerWord = word.toLowerCase();

  const index = lowerText.indexOf(lowerWord);

  if (index === -1) {
    return null;
  }

  // Find the boundaries of the containing word
  const wordStart = findWordStart(text, index);
  const wordEnd = findWordEnd(text, index + word.length);

  const prefix = text.substring(wordStart, index);
  const suffix = text.substring(index + word.length, wordEnd);
  const matchedWord = text.substring(index, index + word.length);

  return {
    startInSearchText: wordStart,
    prefixLength: prefix.length,
    suffix,
    totalMatchLength: wordEnd - wordStart,
    isPartial: true,
    matchedWord
  };
}

/**
 * Split a sentence for multi-word fill-in-the-blank
 * Supports discontinuous phrases by finding each word independently
 * @param sentence The full sentence
 * @param phrase The word or phrase to replace with blanks
 * @param startSearchIndex Optional character index to start searching from (for targeting specific occurrences)
 * @returns MultiWordBlankResult with blanks array and segments
 */
export function splitSentenceForMultiWordBlank(
  sentence: string,
  phrase: string,
  startSearchIndex?: number
): MultiWordBlankResult {
  if (!sentence || !phrase) {
    return {
      blanks: [],
      afterSegment: sentence || '',
      isMultiWord: false,
      totalWords: 0
    };
  }

  const words = splitPhraseIntoWords(phrase);

  if (words.length === 0) {
    return {
      blanks: [],
      afterSegment: sentence,
      isMultiWord: false,
      totalWords: 0
    };
  }

  // Find each word independently in the sentence
  const blanks: WordBlank[] = [];
  // If startSearchIndex is provided, use it; otherwise start from 0
  let currentSearchPos = startSearchIndex !== undefined ? Math.max(0, startSearchIndex) : 0;
  let prevBlankEndPos = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const searchText = sentence.substring(currentSearchPos);

    // Try whole word match first, then partial
    let match = findWholeWordMatch(searchText, word);
    if (!match) {
      match = findPartialMatch(searchText, word);
    }

    if (!match) {
      // Word not found - return fallback (single blank for entire phrase)
      return {
        blanks: [{
          word: phrase.trim(),
          beforeSegment: sentence,
          index: 0,
          isPartialMatch: false
        }],
        afterSegment: '',
        isMultiWord: false,
        totalWords: 1
      };
    }

    const matchStartInSentence = currentSearchPos + match.startInSearchText;

    // Calculate beforeSegment
    let beforeSegment: string;
    if (i === 0) {
      // First word: include everything up to (and including) the prefix
      beforeSegment = sentence.substring(0, matchStartInSentence + match.prefixLength);
    } else {
      // Subsequent words: from end of previous blank to start of this match (plus prefix)
      beforeSegment = sentence.substring(prevBlankEndPos, matchStartInSentence + match.prefixLength);
    }

    blanks.push({
      word: word,
      beforeSegment,
      afterSegment: match.suffix || undefined,
      index: i,
      isPartialMatch: match.isPartial
    });

    // Update positions
    // prevBlankEndPos is where the blank ends (after the word, before suffix)
    prevBlankEndPos = matchStartInSentence + match.prefixLength + word.length;
    // currentSearchPos moves to after the entire matched word (including suffix)
    currentSearchPos = matchStartInSentence + match.totalMatchLength;
  }

  // afterSegment is everything after the last blank (not including per-word suffixes)
  const afterSegment = sentence.substring(prevBlankEndPos);

  return {
    blanks,
    afterSegment,
    isMultiWord: words.length > 1,
    totalWords: words.length
  };
}

/**
 * Check if multiple user answers match the correct words (in order)
 * @param userAnswers Array of user answers for each blank
 * @param correctWords Array of correct words
 * @returns Object with overall correctness and per-word results
 */
export function checkMultiWordMatch(
  userAnswers: string[],
  correctWords: string[]
): {
  isCorrect: boolean;
  wordResults: boolean[];
} {
  if (userAnswers.length !== correctWords.length) {
    return {
      isCorrect: false,
      wordResults: correctWords.map(() => false)
    };
  }

  const wordResults = userAnswers.map((answer, i) =>
    checkWordMatch(answer, correctWords[i])
  );

  return {
    isCorrect: wordResults.every(r => r),
    wordResults
  };
}
