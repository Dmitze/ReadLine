import { BaseRepository } from './BaseRepository';
import { IDatabase } from '../core/types';

export interface PromoCode {
  id?: number;
  code: string;
  description: string;
  promo_type: 'yakaboo_unlimited';
  is_active: boolean;
  created_at?: string;
  created_by?: number;
}

export interface UsedPromoCode {
  id?: number;
  user_id: number;
  promo_code_id: number;
  used_at?: string;
}

export class PromoCodeRepository extends BaseRepository<PromoCode> {
  constructor(db: any) {
    super(db, 'promo_codes');
  }

  async createPromoCode(code: string, adminId?: number): Promise<number> {
    const details = this.generatePromoCodeDetails(code);

    return this.insert({
      code: code.toUpperCase(),
      description: details.description,
      promo_type: details.promo_type,
      is_active: true,
      created_by: adminId,
    });
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | null> {
    const codes = await this.query<PromoCode>('SELECT * FROM promo_codes WHERE code = ?', [
      code.toUpperCase(),
    ]);
    return codes[0] || null;
  }

  async getPromoCodeById(promoCodeId: number): Promise<PromoCode | null> {
    const codes = await this.query<PromoCode>('SELECT * FROM promo_codes WHERE id = ?', [
      promoCodeId,
    ]);
    return codes[0] || null;
  }

  async getAvailablePromoCode(userId: number): Promise<PromoCode | null> {
    const query = `
      SELECT pc.*
      FROM promo_codes pc
      LEFT JOIN used_promo_codes upc ON pc.id = upc.promo_code_id AND upc.user_id = ?
      WHERE pc.is_active = 1
      AND upc.id IS NULL
      ORDER BY pc.created_at ASC
      LIMIT 1
    `;

    const codes = await this.query<PromoCode>(query, [userId]);
    return codes[0] || null;
  }

  async hasUserReceivedPromoCode(userId: number): Promise<boolean> {
    const results = await this.query('SELECT 1 FROM used_promo_codes WHERE user_id = ? LIMIT 1', [
      userId,
    ]);
    return results.length > 0;
  }

  async markPromoCodeAsUsed(userId: number, promoCodeId: number): Promise<void> {
    await this.db.run('INSERT INTO used_promo_codes (user_id, promo_code_id) VALUES (?, ?)', [
      userId,
      promoCodeId,
    ]);
  }

  async getActivePromoCodes(): Promise<PromoCode[]> {
    return this.query('SELECT * FROM promo_codes WHERE is_active = 1 ORDER BY created_at DESC');
  }

  async getAllPromoCodes(): Promise<PromoCode[]> {
    return this.query('SELECT * FROM promo_codes ORDER BY created_at DESC');
  }

  async getAvailablePromoCodesCount(): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM promo_codes pc
      WHERE pc.is_active = 1
      AND pc.id NOT IN (SELECT promo_code_id FROM used_promo_codes)
    `;

    const results = await this.query<{ count: number }>(query);
    return results[0]?.count || 0;
  }

  async getPromoCodesCount(): Promise<number> {
    return this.count({ is_active: true });
  }

  async getPromoCodeStats(): Promise<{
    total: number;
    available: number;
    used: number;
    usedByUsers: number;
  }> {
    const total = await this.count({ is_active: true });
    const available = await this.getAvailablePromoCodesCount();

    const usedResults = await this.db.all<{ count: number }>(
      'SELECT COUNT(*) as count FROM used_promo_codes'
    );
    const used = usedResults[0]?.count || 0;

    const usedByUsersResults = await this.db.all<{ count: number }>(
      'SELECT COUNT(DISTINCT user_id) as count FROM used_promo_codes'
    );
    const usedByUsers = usedByUsersResults[0]?.count || 0;

    return {
      total,
      available,
      used,
      usedByUsers,
    };
  }

  async getPromoCodeUsageCount(promoCodeId: number): Promise<number> {
    const results = await this.db.all<{ count: number }>(
      'SELECT COUNT(*) as count FROM used_promo_codes WHERE promo_code_id = ?',
      [promoCodeId]
    );
    return results[0]?.count || 0;
  }

  async deactivatePromoCode(promoCodeId: number): Promise<void> {
    await this.db.run('UPDATE promo_codes SET is_active = 0 WHERE id = ?', [promoCodeId]);
  }

  async activatePromoCode(promoCodeId: number): Promise<void> {
    await this.db.run('UPDATE promo_codes SET is_active = 1 WHERE id = ?', [promoCodeId]);
  }

  async updatePromoCode(promoCodeId: number, updates: Partial<PromoCode>): Promise<number> {
    return this.update(promoCodeId, updates);
  }

  async deletePromoCode(promoCodeId: number): Promise<void> {
    await this.delete(promoCodeId);
  }

  async canUserUsePromoCode(userId: number, code: string): Promise<boolean> {
    const promoCode = await this.getPromoCodeByCode(code);

    if (!promoCode || !promoCode.is_active) {
      return false;
    }

    const results = await this.db.all<{ count: number }>(
      'SELECT COUNT(*) as count FROM used_promo_codes WHERE user_id = ? AND promo_code_id = ?',
      [userId, promoCode.id]
    );

    return (results[0]?.count || 0) === 0;
  }

  async getUserUsedPromoCodes(userId: number): Promise<PromoCode[]> {
    const query = `
      SELECT pc.* FROM promo_codes pc
      INNER JOIN used_promo_codes upc ON pc.id = upc.promo_code_id
      WHERE upc.user_id = ?
      ORDER BY upc.used_at DESC
    `;

    return this.query(query, [userId]);
  }

  getPromoTypeText(): string {
    return '📚 Yakaboo Unlimited';
  }

  async getUserPromoCode(userId: number): Promise<PromoCode | null> {
    const query = `
      SELECT pc.* FROM promo_codes pc
      INNER JOIN used_promo_codes upc ON pc.id = upc.promo_code_id
      WHERE upc.user_id = ?
    `;
    const codes = await this.query<PromoCode>(query, [userId]);
    return codes[0] || null;
  }

  async returnPromoCode(userId: number): Promise<boolean> {
    const result = await this.db.run('DELETE FROM used_promo_codes WHERE user_id = ?', [userId]);
    return result.changes > 0;
  }

  async getAvailablePromoCodeForUser(): Promise<PromoCode | null> {
    const query = `
      SELECT * FROM promo_codes 
      WHERE is_active = 1 
      AND id NOT IN (SELECT promo_code_id FROM used_promo_codes)
      LIMIT 1
    `;
    const codes = await this.query<PromoCode>(query);
    return codes[0] || null;
  }

  private generatePromoCodeDetails(_code: string): {
    description: string;
    promo_type: 'yakaboo_unlimited';
  } {
    return {
      description: '📚 Промокод на доступ до Yakaboo Unlimited',
      promo_type: 'yakaboo_unlimited',
    };
  }

  async getMostUsedPromoCodes(
    limit: number = 10
  ): Promise<Array<PromoCode & { usage_count: number }>> {
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

  async getPromoCodeUsers(promoCodeId: number): Promise<number[]> {
    const results = await this.db.all<{ user_id: number }>(
      'SELECT DISTINCT user_id FROM used_promo_codes WHERE promo_code_id = ? ORDER BY user_id',
      [promoCodeId]
    );

    return results.map((r) => r.user_id);
  }
}
