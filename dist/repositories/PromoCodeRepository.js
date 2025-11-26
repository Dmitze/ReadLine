"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromoCodeRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
class PromoCodeRepository extends BaseRepository_1.BaseRepository {
    constructor(db) {
        super(db, 'promo_codes');
    }
    async createPromoCode(code, adminId) {
        const details = this.generatePromoCodeDetails(code);
        return this.insert({
            code: code.toUpperCase(),
            description: details.description,
            promo_type: details.promo_type,
            is_active: true,
            created_by: adminId,
        });
    }
    async getPromoCodeByCode(code) {
        const codes = await this.query('SELECT * FROM promo_codes WHERE code = ?', [
            code.toUpperCase(),
        ]);
        return codes[0] || null;
    }
    async getPromoCodeById(promoCodeId) {
        const codes = await this.query('SELECT * FROM promo_codes WHERE id = ?', [
            promoCodeId,
        ]);
        return codes[0] || null;
    }
    async getAvailablePromoCode(userId) {
        const query = `
      SELECT pc.*
      FROM promo_codes pc
      LEFT JOIN used_promo_codes upc ON pc.id = upc.promo_code_id AND upc.user_id = ?
      WHERE pc.is_active = 1
      AND upc.id IS NULL
      ORDER BY pc.created_at ASC
      LIMIT 1
    `;
        const codes = await this.query(query, [userId]);
        return codes[0] || null;
    }
    async hasUserReceivedPromoCode(userId) {
        const results = await this.query('SELECT 1 FROM used_promo_codes WHERE user_id = ? LIMIT 1', [
            userId,
        ]);
        return results.length > 0;
    }
    async markPromoCodeAsUsed(userId, promoCodeId) {
        await this.db.run('INSERT INTO used_promo_codes (user_id, promo_code_id) VALUES (?, ?)', [
            userId,
            promoCodeId,
        ]);
    }
    async getActivePromoCodes() {
        return this.query('SELECT * FROM promo_codes WHERE is_active = 1 ORDER BY created_at DESC');
    }
    async getAllPromoCodes() {
        return this.query('SELECT * FROM promo_codes ORDER BY created_at DESC');
    }
    async getAvailablePromoCodesCount() {
        const query = `
      SELECT COUNT(*) as count
      FROM promo_codes pc
      WHERE pc.is_active = 1
      AND pc.id NOT IN (SELECT promo_code_id FROM used_promo_codes)
    `;
        const results = await this.query(query);
        return results[0]?.count || 0;
    }
    async getPromoCodesCount() {
        return this.count({ is_active: true });
    }
    async getPromoCodeStats() {
        const total = await this.count({ is_active: true });
        const available = await this.getAvailablePromoCodesCount();
        const usedResults = await this.db.all('SELECT COUNT(*) as count FROM used_promo_codes');
        const used = usedResults[0]?.count || 0;
        const usedByUsersResults = await this.db.all('SELECT COUNT(DISTINCT user_id) as count FROM used_promo_codes');
        const usedByUsers = usedByUsersResults[0]?.count || 0;
        return {
            total,
            available,
            used,
            usedByUsers,
        };
    }
    async getPromoCodeUsageCount(promoCodeId) {
        const results = await this.db.all('SELECT COUNT(*) as count FROM used_promo_codes WHERE promo_code_id = ?', [promoCodeId]);
        return results[0]?.count || 0;
    }
    async deactivatePromoCode(promoCodeId) {
        await this.db.run('UPDATE promo_codes SET is_active = 0 WHERE id = ?', [promoCodeId]);
    }
    async activatePromoCode(promoCodeId) {
        await this.db.run('UPDATE promo_codes SET is_active = 1 WHERE id = ?', [promoCodeId]);
    }
    async updatePromoCode(promoCodeId, updates) {
        return this.update(promoCodeId, updates);
    }
    async deletePromoCode(promoCodeId) {
        await this.delete(promoCodeId);
    }
    async canUserUsePromoCode(userId, code) {
        const promoCode = await this.getPromoCodeByCode(code);
        if (!promoCode || !promoCode.is_active) {
            return false;
        }
        const results = await this.db.all('SELECT COUNT(*) as count FROM used_promo_codes WHERE user_id = ? AND promo_code_id = ?', [userId, promoCode.id]);
        return (results[0]?.count || 0) === 0;
    }
    async getUserUsedPromoCodes(userId) {
        const query = `
      SELECT pc.* FROM promo_codes pc
      INNER JOIN used_promo_codes upc ON pc.id = upc.promo_code_id
      WHERE upc.user_id = ?
      ORDER BY upc.used_at DESC
    `;
        return this.query(query, [userId]);
    }
    getPromoTypeText() {
        return '📚 Yakaboo Unlimited';
    }
    async getUserPromoCode(userId) {
        const query = `
      SELECT pc.* FROM promo_codes pc
      INNER JOIN used_promo_codes upc ON pc.id = upc.promo_code_id
      WHERE upc.user_id = ?
    `;
        const codes = await this.query(query, [userId]);
        return codes[0] || null;
    }
    async returnPromoCode(userId) {
        const result = await this.db.run('DELETE FROM used_promo_codes WHERE user_id = ?', [userId]);
        return result.changes > 0;
    }
    async getAvailablePromoCodeForUser() {
        const query = `
      SELECT * FROM promo_codes 
      WHERE is_active = 1 
      AND id NOT IN (SELECT promo_code_id FROM used_promo_codes)
      LIMIT 1
    `;
        const codes = await this.query(query);
        return codes[0] || null;
    }
    generatePromoCodeDetails(_code) {
        return {
            description: '📚 Промокод на доступ до Yakaboo Unlimited',
            promo_type: 'yakaboo_unlimited',
        };
    }
    async getMostUsedPromoCodes(limit = 10) {
        const query = `
      SELECT pc.*, COUNT(upc.id) as usage_count
      FROM promo_codes pc
      LEFT JOIN used_promo_codes upc ON pc.id = upc.promo_code_id
      GROUP BY pc.id
      ORDER BY usage_count DESC
      LIMIT ?
    `;
        return this.db.all(query, [limit]);
    }
    async getPromoCodeUsers(promoCodeId) {
        const results = await this.db.all('SELECT DISTINCT user_id FROM used_promo_codes WHERE promo_code_id = ? ORDER BY user_id', [promoCodeId]);
        return results.map((r) => r.user_id);
    }
}
exports.PromoCodeRepository = PromoCodeRepository;
//# sourceMappingURL=PromoCodeRepository.js.map