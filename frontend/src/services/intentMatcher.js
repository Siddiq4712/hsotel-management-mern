import { INTENTS } from '../config/intents';
import { getSimilarity } from './fuzzyMatcher';
import { detectStudentSearch } from './studentSearchEngine';
import { detectFollowUpTopic, getContext } from './contextManager';

/**
 * Checks if the raw user role is authorized for the intent.
 */
const isRoleAuthorizedForIntent = (intent, rawRole) => {
  if (!intent.roles || intent.roles.length === 0) return true;
  if (!rawRole) return false;
  
  const userRole = rawRole.toLowerCase().trim() === 'lapc' ? 'student' : rawRole.toLowerCase().trim();
  return intent.roles.some(allowedRole => {
    const allowed = allowedRole.toLowerCase().trim() === 'lapc' ? 'student' : allowedRole.toLowerCase().trim();
    return allowed === userRole;
  });
};

/**
 * Core matching logic for a set of candidate intents.
 */
const findBestMatch = (preprocessedInput, candidateIntents) => {
  // 1. Direct exact phrase match
  for (const intent of candidateIntents) {
    for (const keyword of intent.keywords) {
      const kw = keyword.toLowerCase().trim();
      if (preprocessedInput === kw) {
        return { intent, score: 1.0, matchedKeyword: keyword };
      }
    }
  }

  // 2. Keyword inclusion match (longer keywords match first)
  const sortedIntentsWithKeywords = candidateIntents.flatMap(intent => 
    intent.keywords.map(kw => ({
      intent,
      keyword: kw.toLowerCase().trim()
    }))
  ).sort((a, b) => b.keyword.length - a.keyword.length);

  for (const item of sortedIntentsWithKeywords) {
    if (item.keyword.length >= 4 && preprocessedInput.includes(item.keyword)) {
      return { intent: item.intent, score: 0.9, matchedKeyword: item.keyword };
    }
  }

  // 3. Fuzzy matching & word-by-word similarity
  let bestIntent = null;
  let highestScore = 0;
  let matchedKw = '';

  for (const intent of candidateIntents) {
    for (const keyword of intent.keywords) {
      const kw = keyword.toLowerCase().trim();

      // Full phrase similarity
      const phraseScore = getSimilarity(preprocessedInput, kw);
      if (phraseScore > highestScore && phraseScore >= 0.75) {
        highestScore = phraseScore;
        bestIntent = intent;
        matchedKw = keyword;
      }

      // Word-by-word fuzzy comparison
      const inputWords = preprocessedInput.split(/\s+/);
      const kwWords = kw.split(/\s+/);

      for (const iWord of inputWords) {
        for (const kWord of kwWords) {
          if (iWord.length >= 4 && kWord.length >= 4) {
            const wordScore = getSimilarity(iWord, kWord);
            if (wordScore > highestScore && wordScore >= 0.8) {
              highestScore = wordScore;
              bestIntent = intent;
              matchedKw = keyword;
            }
          }
        }
      }
    }
  }

  if (bestIntent && highestScore >= 0.7) {
    return { intent: bestIntent, score: highestScore, matchedKeyword: matchedKw };
  }

  return { intent: null, score: 0 };
};

/**
 * Matches a preprocessed user input string against the configured intents.
 * Priority order:
 *   1. Follow-up context detection (short topic after a student was shown)
 *   2. Authorized intent matching (requires high confidence >= 0.85 to avoid swallowing names)
 *   3. Student search detection (by name/roll pattern)
 *   4. Authorized intent matching (lower confidence fallback)
 *   5. Unauthorized match (for helpful role rejection alerts)
 */
export const matchIntent = (preprocessedInput, userRole, rawInput) => {
  if (!preprocessedInput) {
    return { intent: null, score: 0 };
  }

  const role = userRole ? (userRole.toLowerCase().trim() === 'lapc' ? 'student' : userRole.toLowerCase().trim()) : '';

  // ── Priority 1: Follow-up Context Detection ───────────────────────────────
  const lastStudent = getContext('lastStudent');
  if (lastStudent) {
    const followUpTopic = detectFollowUpTopic(preprocessedInput);
    if (followUpTopic) {
      return {
        intent: {
          intent: 'STUDENT_FOLLOWUP',
          action: 'student_followup',
          roles: ['warden', 'admin'],
          response: `🔍 Fetching ${followUpTopic} for ${lastStudent.name}...`,
        },
        score: 0.92,
        matchedKeyword: followUpTopic,
        followUpTopic,
        followUpStudent: lastStudent,
      };
    }
  }

  // ── Priority 2: Authorized intent matching (High Confidence) ────────────────────────────────
  const authorizedIntents = INTENTS.filter(intent => isRoleAuthorizedForIntent(intent, userRole));
  const authorizedMatch = findBestMatch(preprocessedInput, authorizedIntents);
  
  if (authorizedMatch.intent && authorizedMatch.score >= 0.85) {
    return authorizedMatch;
  }

  // ── Priority 3: Student Search Detection ──────────────────────────────────
  if (role === 'warden' || role === 'admin') {
    const searchQuery = detectStudentSearch(rawInput || preprocessedInput);
    if (searchQuery) {
      return {
        intent: {
          intent: 'STUDENT_SEARCH',
          action: 'student_search',
          roles: ['warden', 'admin'],
          response: '🔍 Searching student database...',
        },
        score: 0.95,
        matchedKeyword: searchQuery,
        searchQuery,
      };
    }
  }

  // ── Priority 4: Authorized intent matching (Lower Confidence) ────────────────────────────────
  if (authorizedMatch.intent) {
    return authorizedMatch;
  }

  // ── Priority 5: Fallback unauthorized match ────────────────────────────────
  return findBestMatch(preprocessedInput, INTENTS);
};
