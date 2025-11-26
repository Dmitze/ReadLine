/**
 * User Functions - функції для роботи з користувачами
 */

import { db } from './models';
import { DatabaseWrapper } from './dbWrapper';

const dbWrapper = new DatabaseWrapper(db);

export interface User {
  id?: number;
  user_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  has_completed_onboarding: boolean;
  favorite_genres?: string; // JSON string of array
  created_at?: string;
  last_active_at?: string;
}

/**
 * Отримати користувача за Telegram user_id
 */
export async function getUserByTelegramId(userId: number): Promise<User | undefined> {
  return dbWrapper.get<User>('SELECT * FROM users WHERE user_id = ?', [userId]);
}

/**
 * Створити нового користувача
 */
export async function createUser(
  userId: number,
  username?: string,
  firstName?: string,
  lastName?: string
): Promise<number> {
  return dbWrapper.insert(
    `INSERT INTO users (user_id, username, first_name, last_name, has_completed_onboarding, last_active_at)
     VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
    [userId, username || null, firstName || null, lastName || null]
  );
}

/**
 * Оновити статус онбордингу
 */
export async function markOnboardingComplete(
  userId: number,
  favoriteGenres?: string[]
): Promise<void> {
  const genresJson = favoriteGenres ? JSON.stringify(favoriteGenres) : null;

  await dbWrapper.update(
    `UPDATE users 
     SET has_completed_onboarding = 1, 
         favorite_genres = ?,
         last_active_at = CURRENT_TIMESTAMP
     WHERE user_id = ?`,
    [genresJson, userId]
  );
}

/**
 * Перевірити чи користувач новий (не завершив онбординг)
 */
export async function isNewUser(userId: number): Promise<boolean> {
  const user = await getUserByTelegramId(userId);

  if (!user) {
    // Користувача немає в БД - це новий користувач
    return true;
  }

  // Перевіряємо чи завершив онбординг
  return !user.has_completed_onboarding;
}

/**
 * Оновити час останньої активності
 */
export async function updateLastActive(userId: number): Promise<void> {
  await dbWrapper.update('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE user_id = ?', [
    userId,
  ]);
}

/**
 * Отримати або створити користувача
 * ✅ ВИПРАВЛЕНО #7: race condition - використовуємо INSERT OR IGNORE для атомарності
 */
export async function getOrCreateUser(
  userId: number,
  username?: string,
  firstName?: string,
  lastName?: string
): Promise<User> {
  // Спочатку намагаємось створити (атомарна операція)
  try {
    await dbWrapper.insert(
      `INSERT OR IGNORE INTO users (user_id, username, first_name, last_name, has_completed_onboarding, last_active_at)
       VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
      [userId, username || null, firstName || null, lastName || null]
    );
  } catch (error) {
    // Ігноруємо помилку якщо користувач вже існує
  }

  // Оновлюємо час останньої активності
  await updateLastActive(userId);

  // Отримуємо користувача
  const user = await getUserByTelegramId(userId);
  return user!;
}

/**
 * Отримати улюблені жанри користувача
 * ✅ ВИПРАВЛЕНО #24: валідація JSON parse
 */
export async function getUserFavoriteGenres(userId: number): Promise<string[]> {
  const user = await getUserByTelegramId(userId);

  if (!user || !user.favorite_genres) {
    return [];
  }

  try {
    const parsed = JSON.parse(user.favorite_genres);
    // Перевіряємо що це масив
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Оновити улюблені жанри користувача
 */
export async function updateUserFavoriteGenres(userId: number, genres: string[]): Promise<void> {
  const genresJson = JSON.stringify(genres);

  await dbWrapper.update(
    'UPDATE users SET favorite_genres = ?, last_active_at = CURRENT_TIMESTAMP WHERE user_id = ?',
    [genresJson, userId]
  );
}

/**
 * Отримати кількість збережених книг користувача
 */
export async function getUserSavedBooksCount(userId: number): Promise<number> {
  const result = await dbWrapper.get<{ count: number }>(
    'SELECT COUNT(*) as count FROM saved_books WHERE user_id = ?',
    [userId]
  );
  return result?.count || 0;
}

/**
 * Отримати кількість відгуків користувача
 */
export async function getUserReviewsCount(userId: number): Promise<number> {
  const result = await dbWrapper.get<{ count: number }>(
    'SELECT COUNT(*) as count FROM reviews WHERE user_id = ?',
    [userId]
  );
  return result?.count || 0;
}

/**
 * Отримати детальну статистику користувача
 */
export async function getUserDetailedStats(userId: number): Promise<{
  savedBooksCount: number;
  reviewsCount: number;
  favoriteGenres: string[];
  totalListeningTime: number;
}> {
  const [savedBooksCount, reviewsCount, favoriteGenres] = await Promise.all([
    getUserSavedBooksCount(userId),
    getUserReviewsCount(userId),
    getUserFavoriteGenres(userId),
  ]);

  // Отримуємо час прослуховування
  const listeningResult = await dbWrapper.get<{ total: number }>(
    'SELECT COALESCE(SUM(total_listened), 0) as total FROM audio_progress WHERE user_id = ?',
    [userId]
  );

  const totalListeningTime = listeningResult?.total || 0;

  return {
    savedBooksCount,
    reviewsCount,
    favoriteGenres,
    totalListeningTime,
  };
}
