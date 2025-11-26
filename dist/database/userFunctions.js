"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserByTelegramId = getUserByTelegramId;
exports.createUser = createUser;
exports.markOnboardingComplete = markOnboardingComplete;
exports.isNewUser = isNewUser;
exports.updateLastActive = updateLastActive;
exports.getOrCreateUser = getOrCreateUser;
exports.getUserFavoriteGenres = getUserFavoriteGenres;
exports.updateUserFavoriteGenres = updateUserFavoriteGenres;
exports.getUserSavedBooksCount = getUserSavedBooksCount;
exports.getUserReviewsCount = getUserReviewsCount;
exports.getUserDetailedStats = getUserDetailedStats;
const models_1 = require("./models");
const dbWrapper_1 = require("./dbWrapper");
const dbWrapper = new dbWrapper_1.DatabaseWrapper(models_1.db);
async function getUserByTelegramId(userId) {
    return dbWrapper.get('SELECT * FROM users WHERE user_id = ?', [userId]);
}
async function createUser(userId, username, firstName, lastName) {
    return dbWrapper.insert(`INSERT INTO users (user_id, username, first_name, last_name, has_completed_onboarding, last_active_at)
     VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`, [userId, username || null, firstName || null, lastName || null]);
}
async function markOnboardingComplete(userId, favoriteGenres) {
    const genresJson = favoriteGenres ? JSON.stringify(favoriteGenres) : null;
    await dbWrapper.update(`UPDATE users 
     SET has_completed_onboarding = 1, 
         favorite_genres = ?,
         last_active_at = CURRENT_TIMESTAMP
     WHERE user_id = ?`, [genresJson, userId]);
}
async function isNewUser(userId) {
    const user = await getUserByTelegramId(userId);
    if (!user) {
        return true;
    }
    return !user.has_completed_onboarding;
}
async function updateLastActive(userId) {
    await dbWrapper.update('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE user_id = ?', [
        userId,
    ]);
}
async function getOrCreateUser(userId, username, firstName, lastName) {
    try {
        await dbWrapper.insert(`INSERT OR IGNORE INTO users (user_id, username, first_name, last_name, has_completed_onboarding, last_active_at)
       VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`, [userId, username || null, firstName || null, lastName || null]);
    }
    catch (error) {
    }
    await updateLastActive(userId);
    const user = await getUserByTelegramId(userId);
    return user;
}
async function getUserFavoriteGenres(userId) {
    const user = await getUserByTelegramId(userId);
    if (!user || !user.favorite_genres) {
        return [];
    }
    try {
        const parsed = JSON.parse(user.favorite_genres);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        return [];
    }
    catch {
        return [];
    }
}
async function updateUserFavoriteGenres(userId, genres) {
    const genresJson = JSON.stringify(genres);
    await dbWrapper.update('UPDATE users SET favorite_genres = ?, last_active_at = CURRENT_TIMESTAMP WHERE user_id = ?', [genresJson, userId]);
}
async function getUserSavedBooksCount(userId) {
    const result = await dbWrapper.get('SELECT COUNT(*) as count FROM saved_books WHERE user_id = ?', [userId]);
    return result?.count || 0;
}
async function getUserReviewsCount(userId) {
    const result = await dbWrapper.get('SELECT COUNT(*) as count FROM reviews WHERE user_id = ?', [userId]);
    return result?.count || 0;
}
async function getUserDetailedStats(userId) {
    const [savedBooksCount, reviewsCount, favoriteGenres] = await Promise.all([
        getUserSavedBooksCount(userId),
        getUserReviewsCount(userId),
        getUserFavoriteGenres(userId),
    ]);
    const listeningResult = await dbWrapper.get('SELECT COALESCE(SUM(total_listened), 0) as total FROM audio_progress WHERE user_id = ?', [userId]);
    const totalListeningTime = listeningResult?.total || 0;
    return {
        savedBooksCount,
        reviewsCount,
        favoriteGenres,
        totalListeningTime,
    };
}
//# sourceMappingURL=userFunctions.js.map