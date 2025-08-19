/**
 * Calculate the Levenshtein distance between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns The Levenshtein distance
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // Create a 2D array for dynamic programming
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Initialize base cases
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  // Fill the dp table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Calculate the similarity score between two strings using Levenshtein distance
 * @param str1 First string
 * @param str2 Second string
 * @returns Similarity score between 0 and 1 (1 being identical)
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  
  if (maxLength === 0) {
    return 1; // Both strings are empty
  }
  
  return 1 - (distance / maxLength);
}

/**
 * Normalize a string by removing spaces and punctuation, and converting to lowercase
 * @param str The string to normalize
 * @returns The normalized string
 */
export function normalizeString(str: string): string {
  // Remove all punctuation and spaces, convert to lowercase
  return str
    .toLowerCase()
    .replace(/[^\w\s]|_/g, '') // Remove punctuation
    .replace(/\s+/g, '');       // Remove spaces
}

/**
 * Expand common contractions to their full forms
 * @param str The string to expand
 * @returns The string with contractions expanded
 */
export function expandContractions(str: string): string {
  const contractions: { [key: string]: string } = {
    "i'll": "i will",
    "i'd": "i would",
    "i've": "i have",
    "i'm": "i am",
    "you'll": "you will",
    "you'd": "you would",
    "you've": "you have",
    "you're": "you are",
    "he'll": "he will",
    "he'd": "he would",
    "he's": "he is",
    "she'll": "she will",
    "she'd": "she would",
    "she's": "she is",
    "it'll": "it will",
    "it'd": "it would",
    "it's": "it is",
    "we'll": "we will",
    "we'd": "we would",
    "we've": "we have",
    "we're": "we are",
    "they'll": "they will",
    "they'd": "they would",
    "they've": "they have",
    "they're": "they are",
    "won't": "will not",
    "wouldn't": "would not",
    "can't": "cannot",
    "couldn't": "could not",
    "shouldn't": "should not",
    "mustn't": "must not",
    "aren't": "are not",
    "isn't": "is not",
    "wasn't": "was not",
    "weren't": "were not",
    "haven't": "have not",
    "hasn't": "has not",
    "hadn't": "had not",
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "let's": "let us",
    "that's": "that is",
    "who's": "who is",
    "what's": "what is",
    "where's": "where is",
    "when's": "when is",
    "why's": "why is",
    "how's": "how is",
    "there's": "there is",
    "here's": "here is",
  };

  let result = str.toLowerCase();
  
  // Handle special cases where 's could be "is" or possessive
  // When 's appears without a following word or followed by certain words, treat as "is"
  // "kid's a" -> "kid is a", "kid's menace" -> "kid is menace"
  result = result.replace(/\b(\w+)'s\s+(a|an|the|menace|cool|awesome|great|bad|good|nice)\b/gi, '$1 is $2');
  result = result.replace(/\b(\w+)'s$/gi, '$1 is'); // Handle 's at end of string
  
  // Replace contractions with their expanded forms
  for (const [contraction, expansion] of Object.entries(contractions)) {
    const regex = new RegExp(`\\b${contraction.replace(/'/g, "['']?")}\\b`, 'gi');
    result = result.replace(regex, expansion);
  }
  
  return result;
}

/**
 * Remove common filler words and dialog markers
 * @param str The string to clean
 * @returns The cleaned string
 */
export function removeFillerWords(str: string): string {
  // List of filler words to remove
  const fillerWords = [
    'oh', 'ah', 'um', 'uh', 'er', 'hmm', 'well', 'like', 'you know',
    'i mean', 'sort of', 'kind of', 'actually', 'basically',
    'hey', 'okay', 'ok', 'alright', 'right'
  ];
  
  let result = str.toLowerCase();
  
  // Remove dialog markers (dashes at the beginning of sentences)
  result = result.replace(/^[-–—]\s*/gm, '');
  result = result.replace(/\s*[-–—]\s*(?=[A-Z])/g, ' ');
  
  // Remove filler words at the beginning of the string
  for (const filler of fillerWords) {
    const regex = new RegExp(`^${filler}[,!.]?\\s+`, 'i');
    result = result.replace(regex, '');
  }
  
  // Remove standalone filler words
  for (const filler of fillerWords) {
    const regex = new RegExp(`\\b${filler}\\b[,]?`, 'gi');
    result = result.replace(regex, '');
  }
  
  // Clean up extra spaces
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

/**
 * Enhanced normalization for more flexible matching
 * @param str The string to normalize
 * @returns The enhanced normalized string
 */
export function enhancedNormalize(str: string): string {
  let result = str;
  
  // Step 0: Fix common OCR/typing errors
  // Replace II with ll in contractions (e.g., "I'II" -> "I'll")
  result = result.replace(/\b(\w+)'II\b/gi, "$1'll");
  
  // Step 1: Expand contractions
  result = expandContractions(result);
  
  // Step 2: Remove filler words and dialog markers
  result = removeFillerWords(result);
  
  // Step 3: Basic normalization (lowercase, remove punctuation)
  result = result
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')     // Normalize spaces (keep single spaces)
    .trim();
  
  return result;
}

/**
 * Word-level similarity check for more flexible matching
 * @param str1 First string
 * @param str2 Second string
 * @returns Similarity score between 0 and 1
 */
export function wordLevelSimilarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  
  if (words1.length === 0 && words2.length === 0) return 1;
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Define equivalent phrases and patterns
  const phraseEquivalents: { [key: string]: string[] } = {
    'made': ['used to make', 'would make'],
    'used to': ['would', 'made'],
    'go': ['go and'],
  };
  
  // Also check for phrase patterns that should be considered equivalent
  // Convert "used to make fun" to "made fun"
  const str1Simplified = str1.replace(/\bused to (make|do|be|have)\b/gi, '$1');
  const str2Simplified = str2.replace(/\bused to (make|do|be|have)\b/gi, '$1');
  
  // If the simplified versions are very similar, consider them equivalent
  if (str1Simplified !== str1 || str2Simplified !== str2) {
    const simplifiedWords1 = str1Simplified.split(/\s+/).filter(w => w.length > 0);
    const simplifiedWords2 = str2Simplified.split(/\s+/).filter(w => w.length > 0);
    
    // Count exact matches in simplified version
    let simplifiedMatches = 0;
    for (const w1 of simplifiedWords1) {
      if (simplifiedWords2.includes(w1)) {
        simplifiedMatches++;
      }
    }
    
    const simplifiedScore = simplifiedMatches / Math.max(simplifiedWords1.length, simplifiedWords2.length);
    if (simplifiedScore >= 0.8) {
      return simplifiedScore;
    }
  }
  
  // Count matching words (allowing for article variations)
  let matches = 0;
  const used2 = new Set<number>();
  
  for (let i1 = 0; i1 < words1.length; i1++) {
    const word1 = words1[i1];
    
    for (let i2 = 0; i2 < words2.length; i2++) {
      if (used2.has(i2)) continue;
      
      const word2 = words2[i2];
      
      // Exact match or article variation
      if (word1 === word2 || 
          (word1 === 'a' && word2 === 'the') || 
          (word1 === 'the' && word2 === 'a')) {
        matches++;
        used2.add(i2);
        break;
      }
      
      // Allow minor variations (e.g., "made" vs "make")
      const stem1 = word1.replace(/(?:s|ed|ing|es|d)$/, '');
      const stem2 = word2.replace(/(?:s|ed|ing|es|d)$/, '');
      if (stem1 === stem2 && stem1.length > 2) {
        matches++;
        used2.add(i2);
        break;
      }
      
      // Check for phrase equivalents
      if (phraseEquivalents[word1]) {
        for (const equiv of phraseEquivalents[word1]) {
          const equivWords = equiv.split(' ');
          if (i2 + equivWords.length <= words2.length) {
            const phrase2 = words2.slice(i2, i2 + equivWords.length).join(' ');
            if (phrase2 === equiv) {
              matches++;
              for (let j = 0; j < equivWords.length; j++) {
                used2.add(i2 + j);
              }
              break;
            }
          }
        }
      }
    }
  }
  
  // Calculate similarity based on the proportion of matching words
  const avgLength = (words1.length + words2.length) / 2;
  return matches / avgLength;
}

/**
 * Enhanced string similarity check with multiple strategies
 * @param userAnswer The user's answer
 * @param correctAnswer The correct answer
 * @param threshold Similarity threshold (default: 0.85)
 * @returns True if the answers are similar enough
 */
export function checkAnswerSimilarity(
  userAnswer: string,
  correctAnswer: string,
  threshold: number = 0.85
): boolean {
  // Strategy 1: Enhanced normalization with Levenshtein
  const enhanced1 = enhancedNormalize(userAnswer);
  const enhanced2 = enhancedNormalize(correctAnswer);
  
  const enhancedSimilarity = levenshteinSimilarity(enhanced1, enhanced2);
  if (enhancedSimilarity >= threshold) {
    return true;
  }
  
  // Strategy 2: Special handling for "made" vs "used to make" variations
  // Simplify both strings by removing "used to" before verbs
  const simplified1 = enhanced1.replace(/\bused to (make|do|have|be|get|take|give)\b/gi, '$1');
  const simplified2 = enhanced2.replace(/\bused to (make|do|have|be|get|take|give)\b/gi, '$1');
  
  const simplifiedSimilarity = levenshteinSimilarity(simplified1, simplified2);
  if (simplifiedSimilarity >= threshold) {
    return true;
  }
  
  // Strategy 3: Word-level matching for close matches
  if (enhancedSimilarity >= 0.7 || simplifiedSimilarity >= 0.7) {
    const wordSimilarity = wordLevelSimilarity(enhanced1, enhanced2);
    if (wordSimilarity >= 0.8) { // Slightly lower threshold for word-level
      return true;
    }
  }
  
  // Strategy 4: Remove all spaces and check if core content matches
  const core1 = enhanced1.replace(/\s+/g, '');
  const core2 = enhanced2.replace(/\s+/g, '');
  const coreSimilarity = levenshteinSimilarity(core1, core2);
  if (coreSimilarity >= threshold) {
    return true;
  }
  
  return false;
}

/**
 * Check if two strings are similar based on Levenshtein distance
 * @param str1 First string
 * @param str2 Second string
 * @param threshold Similarity threshold (default: 0.85)
 * @param normalize Whether to normalize strings before comparison (default: true)
 * @returns True if similarity score is >= threshold
 */
export function areStringsSimilar(
  str1: string, 
  str2: string, 
  threshold: number = 0.85,
  normalize: boolean = true
): boolean {
  const s1 = normalize ? normalizeString(str1) : str1;
  const s2 = normalize ? normalizeString(str2) : str2;
  
  const similarity = levenshteinSimilarity(s1, s2);
  return similarity >= threshold;
}