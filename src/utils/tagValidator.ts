export const isValidTag = (tag: string): boolean => {
  if (!tag || typeof tag !== 'string') {
    return false;
  }

  const trimmed = tag.trim();

  if (trimmed.length === 0 || trimmed.length > 50) {
    return false;
  }

  const words = trimmed.split(/\s+/);

  if (words.length > 2) {
    return false;
  }

  const validRegex = /^[\p{L}\p{N}\-']+$/u;

  for (const word of words) {
    if (!validRegex.test(word)) {
      return false;
    }
  }

  return true;
};

/**
 * Нормалізує тег для зберігання
 * - Приводить до нижнього регістру (крім першої букви)
 * - Замінює пробіли на підкреслення
 */
export const normalizeTag = (tag: string): string => {
  return tag
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      // Першу букву кожного слова - з великої літери
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('_');
};

export const sanitizeTag = (tag: string): string => {
  if (!tag) return '';

  return tag
    .replace(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9\s\-']/g, '')
    .trim()
    .substring(0, 50);
};

export const splitCompoundTag = (tag: string): string[] => {
  return tag
    .trim()
    .split(/[\s_]+/)
    .filter((word) => word.length > 0)
    .map((word) => normalizeTag(word));
};
