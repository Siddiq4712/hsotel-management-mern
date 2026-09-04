/**
 * Preprocesses user input by:
 * 1. Converting to lowercase
 * 2. Removing punctuation and special characters
 * 3. Collapsing multiple spaces into a single space
 * 4. Trimming leading and trailing whitespace
 */
export const preprocessInput = (input) => {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};
