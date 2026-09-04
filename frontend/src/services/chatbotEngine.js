import { preprocessInput } from '../utils/preprocessInput';
import { matchIntent } from './intentMatcher';
import { validateUserRoleForIntent } from './roleValidator';
import { getSuggestionsForRole } from '../config/intents';

/**
 * Processes user raw input messages.
 * Matches keywords, handles fuzzy terms, validates authorization, and outputs actions.
 * v2: forwards searchQuery, followUpTopic, followUpStudent from matchIntent result.
 */
export const processUserMessage = (rawInput, userRole) => {
  const cleanInput = preprocessInput(rawInput);

  if (!cleanInput) {
    return {
      reply: "Please type your question below. I'm here to help! 😊",
      suggestions: getSuggestionsForRole(userRole || 'student')
    };
  }

  // Find matching intent (pass rawInput for student search pattern detection)
  const matchResult = matchIntent(cleanInput, userRole, rawInput);

  if (!matchResult.intent) {
    const suggestions = getSuggestionsForRole(userRole || 'student');
    const suggestionsList = suggestions.map(s => `• ${s}`).join('\n');
    return {
      reply: `I couldn't understand that. 😅\n\nTry asking:\n\n${suggestionsList}`,
      suggestions
    };
  }

  // Validate role authorization
  const validation = validateUserRoleForIntent(matchResult.intent, userRole);
  if (!validation.isValid) {
    return {
      reply: validation.errorMessage || 'Unauthorized.',
      suggestions: getSuggestionsForRole(userRole || 'student')
    };
  }

  // Build the action data — include all v2 extended fields
  const actionData = {
    action: matchResult.intent.action,
    navigationPath: matchResult.intent.navigationPath,
    apiEndpoint: matchResult.intent.apiEndpoint,
    // v2 search / follow-up fields
    searchQuery: matchResult.searchQuery || null,
    followUpTopic: matchResult.followUpTopic || null,
    followUpStudent: matchResult.followUpStudent || null,
  };

  return {
    reply: matchResult.intent.response,
    suggestions: getSuggestionsForRole(userRole || 'student'),
    actionData,
    _intent: matchResult.intent,
  };
};
