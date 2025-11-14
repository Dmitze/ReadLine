/**
 * Tag Validation Utilities
 * Валідація та нормалізація тегів
 */

/**
 * Перевіряє чи тег валідний
 * - максимум 2 слова
 * - дозволяє букви, цифри, дефіси та апострофи
 */
export const isValidTag = (tag: string): boolean => {
  if (!tag || typeof tag !== 'string') {
    return false;
  }

  const trimmed = tag.trim();

  // Перевіряємо довжину
  if (trimmed.length === 0 || trimmed.length > 50) {
    return false;
  }

  // Рахуємо кількість слів (розділених пробілами)
  const words = trimmed.split(/\s+/);

  // Максимум 2 слова
  if (words.length > 2) {
    return false;
  }

  // Перевіряємо кожне слово
  // Дозволяємо букви (включаючи кирилицю), цифри, дефіси та апострофи
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
    .map((word) => {
      // Першу букву кожного слова - з великої літери
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('_');
};

/**
 * Санітизує тег - видаляє невалідні символи
 */
export const sanitizeTag = (tag: string): string => {
  if (!tag) return '';

  return tag
    .replace(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9\s\-']/g, '') // Видаляємо невалідні символи
    .trim()
    .substring(0, 50); // Обмежуємо довжину
};

/**
 * Розбиває теги з пробілами на окремі теги
 * Наприклад: "Сучасна література" -> ["Сучасна", "Література"]
 */
export const splitCompoundTag = (tag: string): string[] => {
  return tag
    .trim()
    .split(/[\s_]+/)
    .filter((word) => word.length > 0)
    .map((word) => normalizeTag(word));
};
