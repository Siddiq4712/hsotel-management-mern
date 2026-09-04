/**
 * Normalizes roles to handle special aliases (e.g. 'lapc' -> 'student')
 */
const normalizeRoleForChatbot = (role) => {
  if (!role) return '';
  const r = role.toLowerCase().trim();
  if (r === 'lapc') return 'student';
  return r;
};

/**
 * Validates whether the logged-in user's role is permitted to perform the intent's action.
 */
export const validateUserRoleForIntent = (intent, rawRole) => {
  if (!intent.roles || intent.roles.length === 0) {
    return { isValid: true };
  }

  if (!rawRole) {
    return {
      isValid: false,
      errorMessage: "You must be logged in to perform this action. 🔒"
    };
  }

  const userRole = normalizeRoleForChatbot(rawRole);
  
  // Check if role matches
  const isAllowed = intent.roles.some(allowedRole => normalizeRoleForChatbot(allowedRole) === userRole);

  if (!isAllowed) {
    const allowedRolesFormatted = intent.roles
      .map(r => r.charAt(0).toUpperCase() + r.slice(1))
      .join(' or ');

    return {
      isValid: false,
      errorMessage: `Sorry 😅 This feature is only available for the ${allowedRolesFormatted}.`
    };
  }

  return { isValid: true };
};
