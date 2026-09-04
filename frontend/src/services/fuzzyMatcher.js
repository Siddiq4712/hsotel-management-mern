/**
 * Computes the Levenshtein Distance between two strings.
 */
export const getLevenshteinDistance = (a, b) => {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

/**
 * Calculates a similarity score between 0 and 1.
 * 1 means identical, 0 means completely different.
 */
export const getSimilarity = (str1, str2) => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const distance = getLevenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  return 1.0 - distance / maxLength;
};

/**
 * Checks if input is a fuzzy match for a target phrase with similarity above a threshold.
 * Also handles token-based matching to support Tanglish/mixed phrases.
 */
export const isFuzzyMatch = (input, target, threshold = 0.7) => {
  const normInput = input.trim();
  const normTarget = target.trim();

  // 1. Check direct inclusion
  if (normInput.includes(normTarget) || normTarget.includes(normInput)) {
    return true;
  }

  // 2. Full phrase similarity
  if (getSimilarity(normInput, normTarget) >= threshold) {
    return true;
  }

  // 3. Word-by-word fuzzy comparison for multi-word queries
  const inputWords = normInput.split(/\s+/);
  const targetWords = normTarget.split(/\s+/);

  for (const tWord of targetWords) {
    if (tWord.length < 3) continue; // Skip very short words like 'in', 'to'
    for (const iWord of inputWords) {
      if (iWord.length < 3) continue;
      if (getSimilarity(iWord, tWord) >= 0.8) {
        return true;
      }
    }
  }

  return false;
};
