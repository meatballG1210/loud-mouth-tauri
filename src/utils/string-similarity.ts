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