import { BaseRepository } from './BaseRepository';
import { IDatabase } from '../core/types';

/**
 * PromoCode entity interface
 */
export interface PromoCode {
  id?: number;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed' | 'shipping';
  discount_value: number;
  is_active: boolean;
  created_at?: string;
  created_by?: number;
}

/**
 * UsedPromoCode tracking interface
 */
export interface UsedPromoCode {
  id?: number;
  user_id: number;
  promo_code_id: number;
  used_at?: string;
}

/**
 * PromoCodeRepository - Manages promotional codes and their usage
 * Handles promo code creation, validation, and usage tracking
 */
export class PromoCodeRepository extends BaseRepository<PromoCode> {
  /**
   * Creates instance of PromoCodeRepository
   * @param db DatabaseWrapper instance
   */
  constructor(db: any) {
    super(db, 'promo_codes');
  }

  /**
   * Create a new promo code
   * @param code Promo code string
   * @param adminId Admin user ID who created the code
   * @returns Promise with promo code ID
   */
  async createPromoCode(code: string, adminId?: number): Promise<number> {
    const details = this.generatePromoCodeDetails(code);

    return this.insert({
      code: code.toUpperCase(),
      description: details.description,
      discount_type: details.discount_type,
      discount_value: details.discount_value,
      is_active: true,
      created_by: adminId,
    });
  }

  /**
   * Get promo code by code string
   * @param code Promo code
   * @returns Promise with PromoCode or null
   */
  async getPromoCodeByCode(code: string): Promise<PromoCode | null> {
    const codes = await this.query<PromoCode>('SELECT * FROM promo_codes WHERE code = ?', [
      code.toUpperCase(),
    ]);
    return codes[0] || null;
  }

  /**
   * Get promo code by ID
   * @param promoCodeId Promo code ID
   * @returns Promise with PromoCode or null
   */
  async getPromoCodeById(promoCodeId: number): Promise<PromoCode | null> {
    const codes = await this.query<PromoCode>('SELECT * FROM promo_codes WHERE id = ?', [
      promoCodeId,
    ]);
    return codes[0] || null;
  }

  /**
   * Get available promo code for a user (not yet used by them)
   * @param userId User ID
   * @returns Promise with PromoCode or null
   */
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

  /**
   * Check if user has already used a promo code
   * @param userId User ID
   * @returns Promise with boolean
   */
  async hasUserReceivedPromoCode(userId: number): Promise<boolean> {
    const results = await this.query('SELECT 1 FROM used_promo_codes WHERE user_id = ? LIMIT 1', [
      userId,
    ]);
    return results.length > 0;
  }

  /**
   * Mark promo code as used by a user
   * @param userId User ID
   * @param promoCodeId Promo code ID
   * @returns Promise<void>
   */
  async markPromoCodeAsUsed(userId: number, promoCodeId: number): Promise<void> {
    await this.db.run('INSERT INTO used_promo_codes (user_id, promo_code_id) VALUES (?, ?)', [
      userId,
      promoCodeId,
    ]);
  }

  /**
   * Get all active promo codes
   * @returns Promise with PromoCode array
   */
  async getActivePromoCodes(): Promise<PromoCode[]> {
    return this.query('SELECT * FROM promo_codes WHERE is_active = 1 ORDER BY created_at DESC');
  }

  /**
   * Get all promo codes (active and inactive)
   * @returns Promise with PromoCode array
   */
  async getAllPromoCodes(): Promise<PromoCode[]> {
    return this.query('SELECT * FROM promo_codes ORDER BY created_at DESC');
  }

  /**
   * Get count of available promo codes
   * @returns Promise with count
   */
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

  /**
   * Get count of all active promo codes
   * @returns Promise with count
   */
  async getPromoCodesCount(): Promise<number> {
    return this.count({ is_active: true });
  }

  /**
   * Get comprehensive promo code statistics
   * @returns Promise with detailed stats
   */
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

  /**
   * Get usage count for a specific promo code
   * @param promoCodeId Promo code ID
   * @returns Promise with usage count
   */
  async getPromoCodeUsageCount(promoCodeId: number): Promise<number> {
    const results = await this.db.all<{ count: number }>(
      'SELECT COUNT(*) as count FROM used_promo_codes WHERE promo_code_id = ?',
      [promoCodeId]
    );
    return results[0]?.count || 0;
  }

  /**
   * Deactivate a promo code
   * @param promoCodeId Promo code ID
   * @returns Promise<void>
   */
  async deactivatePromoCode(promoCodeId: number): Promise<void> {
    await this.db.run('UPDATE promo_codes SET is_active = 0 WHERE id = ?', [promoCodeId]);
  }

  /**
   * Activate a promo code
   * @param promoCodeId Promo code ID
   * @returns Promise<void>
   */
  async activatePromoCode(promoCodeId: number): Promise<void> {
    await this.db.run('UPDATE promo_codes SET is_active = 1 WHERE id = ?', [promoCodeId]);
  }

  /**
   * Update promo code details
   * @param promoCodeId Promo code ID
   * @param updates Partial PromoCode data
   * @returns Promise with number of affected rows
   */
  async updatePromoCode(promoCodeId: number, updates: Partial<PromoCode>): Promise<number> {
    return this.update(promoCodeId, updates);
  }

  /**
   * Delete a promo code
   * @param promoCodeId Promo code ID
   * @returns Promise<void>
   */
  async deletePromoCode(promoCodeId: number): Promise<void> {
    await this.delete(promoCodeId);
  }

  /**
   * Check if user can use a promo code (not used before)
   * @param userId User ID
   * @param code Promo code
   * @returns Promise with boolean
   */
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

  /**
   * Get promo code usage by user
   * @param userId User ID
   * @returns Promise with array of used promo codes
   */
  async getUserUsedPromoCodes(userId: number): Promise<PromoCode[]> {
    const query = `
      SELECT pc.* FROM promo_codes pc
      INNER JOIN used_promo_codes upc ON pc.id = upc.promo_code_id
      WHERE upc.user_id = ?
      ORDER BY upc.used_at DESC
    `;

    return this.query(query, [userId]);
  }

  /**
   * Get discount text representation
   * @param discountType Type of discount
   * @param value Discount value
   * @returns String representation
   */
  getDiscountText(discountType: string, value: number): string {
    switch (discountType) {
      case 'percentage':
        return `${value}% знижка`;
      case 'fixed':
        return `${value} грн знижка`;
      case 'shipping':
        return 'Безкоштовна доставка';
      default:
        return 'Знижка';
    }
  }

  /**
   * Generate promo code details based on code pattern
   * @param code Promo code
   * @returns Object with description and discount details
   */
  private generatePromoCodeDetails(code: string): {
    description: string;
    discount_type: 'percentage' | 'fixed' | 'shipping';
    discount_value: number;
  } {
    const codeUpper = code.toUpperCase();

    // Welcome promo codes
    if (codeUpper.includes('WELCOME') || codeUpper.includes('NEW') || codeUpper.includes('HELLO')) {
      return {
        description: '🎉 Вітальний промокод - знижка 15% на перше замовлення на Yakaboo.ua',
        discount_type: 'percentage',
        discount_value: 15,
      };
    }

    // Summer promo codes
    if (codeUpper.includes('SUMMER') || codeUpper.includes('ЛІТО')) {
      return {
        description: '☀️ Літня знижка - спеціальна пропозиція 20% на Yakaboo.ua',
        discount_type: 'percentage',
        discount_value: 20,
      };
    }

    // Spring promo codes
    if (codeUpper.includes('SPRING') || codeUpper.includes('ВЕСНА')) {
      return {
        description: '🌸 Весняна знижка - спеціальна пропозиція 20% на Yakaboo.ua',
        discount_type: 'percentage',
        discount_value: 20,
      };
    }

    // Winter promo codes
    if (codeUpper.includes('WINTER') || codeUpper.includes('ЗИМА')) {
      return {
        description: '❄️ Зимова знижка - спеціальна пропозиція 20% на Yakaboo.ua',
        discount_type: 'percentage',
        discount_value: 20,
      };
    }

    // Autumn promo codes
    if (codeUpper.includes('AUTUMN') || codeUpper.includes('FALL') || codeUpper.includes('ОСІНЬ')) {
      return {
        description: '🍂 Осіння знижка - спеціальна пропозиція 20% на Yakaboo.ua',
        discount_type: 'percentage',
        discount_value: 20,
      };
    }

    // Free shipping
    if (
      codeUpper.includes('SHIP') ||
      codeUpper.includes('DELIVERY') ||
      codeUpper.includes('FREE')
    ) {
      return {
        description: '🚚 Безкоштовна доставка для вашого замовлення на Yakaboo.ua',
        discount_type: 'shipping',
        discount_value: 0,
      };
    }

    // Student promo codes
    if (codeUpper.includes('STUDENT') || codeUpper.includes('СТУДЕНТ')) {
      return {
        description: '🎓 Студентська знижка 15% на Yakaboo.ua',
        discount_type: 'percentage',
        discount_value: 15,
      };
    }

    // Extract percentage from code (e.g., "PROMO25" -> 25%)
    const numberMatch = codeUpper.match(/(\d+)/);
    if (numberMatch) {
      const value = parseInt(numberMatch[1]);
      if (value >= 5 && value <= 50) {
        return {
          description: `💰 Спеціальна знижка ${value}% за промокодом на Yakaboo.ua`,
          discount_type: 'percentage',
          discount_value: value,
        };
      }
    }

    // Default promo code
    return {
      description: '🎁 Спеціальна знижка 10% за промокодом на Yakaboo.ua',
      discount_type: 'percentage',
      discount_value: 10,
    };
  }

  /**
   * Get most used promo codes
   * @param limit Maximum number of results
   * @returns Promise with promo codes and usage count
   */
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

  /**
   * Get all users who used a specific promo code
   * @param promoCodeId Promo code ID
   * @returns Promise with user IDs
   */
  async getPromoCodeUsers(promoCodeId: number): Promise<number[]> {
    const results = await this.db.all<{ user_id: number }>(
      'SELECT DISTINCT user_id FROM used_promo_codes WHERE promo_code_id = ? ORDER BY user_id',
      [promoCodeId]
    );

    return results.map((r) => r.user_id);
  }
}
