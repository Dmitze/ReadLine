/**
 * Promo Code Functions - функції для роботи з промокодами
 *
 * @module promoCodeFunctions
 */

import { db } from './models';
import { logger } from '../utils/logger';

/**
 * Represents a promo code entity
 */
export interface PromoCode {
  /** Unique identifier for the promo code */
  id?: number;
  /** The promo code string (uppercase) */
  code: string;
  /** Human-readable description of the promo code */
  description: string;
  /** Type of promo code (currently only yakaboo_unlimited) */
  promo_type: 'yakaboo_unlimited';
  /** Whether the promo code is active and can be used */
  is_active: boolean;
  /** Timestamp when promo code was created */
  created_at?: string;
  /** ID of the admin who created this promo code */
  created_by?: number;
}

/**
 * Represents a used promo code record
 */
export interface UsedPromoCode {
  /** Unique identifier for the usage record */
  id?: number;
  /** ID of the user who used the promo code */
  user_id: number;
  /** ID of the promo code that was used */
  promo_code_id: number;
  /** Timestamp when the promo code was used */
  used_at?: string;
}

/**
 * Adds a new promo code to the database
 *
 * @param code - The promo code string (will be converted to uppercase)
 * @param adminId - Optional ID of the admin creating the promo code
 * @returns Promise resolving to the new promo code ID
 * @throws Error if database operation fails
 *
 * @example
 * ```typescript
 * const promoId = await addPromoCode('SUMMER2024', 123);
 * console.log(`Promo code created with ID: ${promoId}`);
 * ```
 */
export const addPromoCode = (code: string, adminId?: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const details = generatePromoCodeDetails(code);

    const query = `
      INSERT INTO promo_codes (code, description, promo_type, created_by)
      VALUES (?, ?, ?, ?)
    `;

    db.run(
      query,
      [code.toUpperCase(), details.description, details.promo_type, adminId || null],
      function (err) {
        if (err) {
          logger.error('Error adding promo code', err, { code });
          reject(err);
        } else {
          logger.info('Promo code added', { code, id: this.lastID });
          resolve(this.lastID);
        }
      }
    );
  });
};

/**
 * Генерація деталей промокоду
 * Всі промокоди дають доступ до Yakaboo Unlimited
 */
function generatePromoCodeDetails(_code: string): {
  description: string;
  promo_type: 'yakaboo_unlimited';
} {
  return {
    description: '📚 Промокод на доступ до Yakaboo Unlimited',
    promo_type: 'yakaboo_unlimited',
  };
}

/**
 * Retrieves a promo code by its code string
 *
 * @param code - The promo code string (case-insensitive, will be converted to uppercase)
 * @returns Promise resolving to the promo code data or undefined if not found
 * @throws Error if database operation fails
 *
 * @example
 * ```typescript
 * const promo = await getPromoCodeByCode('SUMMER2024');
 * if (promo) {
 *   console.log(`Found promo: ${promo.description}`);
 * }
 * ```
 */
export const getPromoCodeByCode = (code: string): Promise<PromoCode | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM promo_codes WHERE code = ?',
      [code.toUpperCase()],
      (err, row: PromoCode) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
};

/**
 * Gets an available promo code for a specific user (one they haven't used yet)
 *
 * @param userId - ID of the user to get promo code for
 * @returns Promise resolving to the first available promo code or undefined if none available
 * @throws Error if database operation fails
 *
 * @example
 * ```typescript
 * const promo = await getAvailablePromoCode(123);
 * if (promo) {
 *   console.log(`Available promo for user: ${promo.code}`);
 * }
 * ```
 */
export const getAvailablePromoCode = (userId: number): Promise<PromoCode | undefined> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT pc.*
      FROM promo_codes pc
      LEFT JOIN used_promo_codes upc ON pc.id = upc.promo_code_id AND upc.user_id = ?
      WHERE pc.is_active = 1
      AND upc.id IS NULL
      ORDER BY pc.created_at ASC
      LIMIT 1
    `;

    db.get(query, [userId], (err, row: PromoCode) => {
      if (err) {
        logger.error('Error getting available promo code', err, { userId });
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

/**
 * Checks if a user has already received any promo code
 *
 * @param userId - ID of the user to check
 * @returns Promise resolving to true if user has received a promo code, false otherwise
 * @throws Error if database operation fails
 */
export const hasUserReceivedPromoCode = (userId: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    db.get('SELECT 1 FROM used_promo_codes WHERE user_id = ? LIMIT 1', [userId], (err, row) => {
      if (err) reject(err);
      else resolve(!!row);
    });
  });
};

/**
 * Marks a promo code as used by a specific user
 *
 * @param userId - ID of the user who used the promo code
 * @param promoCodeId - ID of the promo code that was used
 * @returns Promise resolving when the operation is complete
 * @throws Error if database operation fails
 *
 * @example
 * ```typescript
 * await markPromoCodeAsUsed(123, 456);
 * console.log('Promo code marked as used');
 * ```
 */
export const markPromoCodeAsUsed = (userId: number, promoCodeId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO used_promo_codes (user_id, promo_code_id) VALUES (?, ?)',
      [userId, promoCodeId],
      (err) => {
        if (err) {
          logger.error('Error marking promo code as used', err, { userId, promoCodeId });
          reject(err);
        } else {
          logger.info('Promo code marked as used', { userId, promoCodeId });
          resolve();
        }
      }
    );
  });
};

/**
 * Gets the promo code that was assigned to a specific user
 *
 * @param userId - ID of the user
 * @returns Promise resolving to the user's promo code or undefined if none assigned
 * @throws Error if database operation fails
 */
export const getUserPromoCode = (userId: number): Promise<PromoCode | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT pc.* FROM promo_codes pc
       INNER JOIN used_promo_codes upc ON pc.id = upc.promo_code_id
       WHERE upc.user_id = ?`,
      [userId],
      (err, row: PromoCode) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
};

/**
 * Returns a promo code (removes the user assignment, making it available again)
 *
 * @param userId - ID of the user to return the promo code from
 * @returns Promise resolving to true if a promo code was returned, false if user had no promo code
 * @throws Error if database operation fails
 */
export const returnPromoCode = (userId: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM used_promo_codes WHERE user_id = ?', [userId], function (err) {
      if (err) {
        logger.error('Error returning promo code', err, { userId });
        reject(err);
      } else {
        logger.info('Promo code returned', { userId, changes: this.changes });
        resolve(this.changes > 0);
      }
    });
  });
};

/**
 * Gets any available promo code (not assigned to any user)
 *
 * @returns Promise resolving to the first available promo code or undefined if none available
 * @throws Error if database operation fails
 */
export const getAvailablePromoCodeForUser = (): Promise<PromoCode | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM promo_codes 
       WHERE is_active = 1 
       AND id NOT IN (SELECT promo_code_id FROM used_promo_codes)
       LIMIT 1`,
      [],
      (err, row: PromoCode) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
};

/**
 * Gets the count of available promo codes (active and not assigned to users)
 *
 * @returns Promise resolving to the number of available promo codes
 * @throws Error if database operation fails
 */
export const getAvailablePromoCodesCount = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT COUNT(*) as count
      FROM promo_codes pc
      WHERE pc.is_active = 1
      AND pc.id NOT IN (SELECT promo_code_id FROM used_promo_codes)
    `;

    db.get(query, [], (err, row: any) => {
      if (err) reject(err);
      else resolve(row?.count || 0);
    });
  });
};

/**
 * Gets the total count of all active promo codes
 *
 * @returns Promise resolving to the total number of active promo codes
 * @throws Error if database operation fails
 */
export const getAllPromoCodesCount = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM promo_codes WHERE is_active = 1', [], (err, row: any) => {
      if (err) reject(err);
      else resolve(row?.count || 0);
    });
  });
};

/**
 * Gets all promo codes in the system (admin function)
 *
 * @returns Promise resolving to array of all promo codes ordered by creation date
 * @throws Error if database operation fails
 */
export const getAllPromoCodes = (): Promise<PromoCode[]> => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM promo_codes ORDER BY created_at DESC', [], (err, rows: PromoCode[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

/**
 * Отримати статистику використання промокодів
 */
export const getPromoCodeStats = (): Promise<{
  total: number;
  available: number;
  used: number;
  usedByUsers: number;
}> => {
  return new Promise(async (resolve, reject) => {
    try {
      const total = await getAllPromoCodesCount();
      const available = await getAvailablePromoCodesCount();

      const usedResult = await new Promise<any>((res, rej) => {
        db.get('SELECT COUNT(*) as count FROM used_promo_codes', [], (err, row) => {
          if (err) rej(err);
          else res(row);
        });
      });

      const usedByUsersResult = await new Promise<any>((res, rej) => {
        db.get('SELECT COUNT(DISTINCT user_id) as count FROM used_promo_codes', [], (err, row) => {
          if (err) rej(err);
          else res(row);
        });
      });

      resolve({
        total,
        available,
        used: usedResult?.count || 0,
        usedByUsers: usedByUsersResult?.count || 0,
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Отримати розширену статистику промокодів
 */
export const getExtendedPromoStats = (): Promise<{
  total: number;
  available: number;
  used: number;
  usedByUsers: number;
  usagePercent: number;
  byDiscountType: { type: string; count: number; totalValue: number }[];
  topPromos: { code: string; used: number; description: string }[];
  avgUsage: number;
  createdToday: number;
  createdThisWeek: number;
}> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Базова статистика
      const basicStats = await getPromoCodeStats();
      const usagePercent =
        basicStats.total > 0 ? Math.round((basicStats.used / basicStats.total) * 100) : 0;
      const avgUsage =
        basicStats.used > 0 ? Math.round(basicStats.used / basicStats.usedByUsers) : 0;

      // За типами знижок
      const byDiscountType = await new Promise<any[]>((res, rej) => {
        db.all(
          `SELECT discount_type as type, COUNT(*) as count, SUM(discount_value) as totalValue 
           FROM promo_codes 
           WHERE is_active = 1
           GROUP BY discount_type`,
          [],
          (err, rows) => {
            if (err) rej(err);
            else res(rows || []);
          }
        );
      });

      // Топ промокоди за використанням
      const topPromos = await new Promise<any[]>((res, rej) => {
        db.all(
          `SELECT pc.code, pc.description, COUNT(upc.id) as used
           FROM promo_codes pc
           LEFT JOIN used_promo_codes upc ON pc.id = upc.promo_code_id
           WHERE pc.is_active = 1
           GROUP BY pc.id
           ORDER BY used DESC
           LIMIT 5`,
          [],
          (err, rows) => {
            if (err) rej(err);
            else res(rows || []);
          }
        );
      });

      // Промокоди створені сьогодні
      const createdToday = await new Promise<number>((res, rej) => {
        db.get(
          `SELECT COUNT(*) as count FROM promo_codes 
           WHERE DATE(created_at) = DATE('now') AND is_active = 1`,
          [],
          (err, row: any) => {
            if (err) rej(err);
            else res(row?.count || 0);
          }
        );
      });

      // Промокоди створені цього тижня
      const createdThisWeek = await new Promise<number>((res, rej) => {
        db.get(
          `SELECT COUNT(*) as count FROM promo_codes 
           WHERE datetime(created_at) > datetime('now', '-7 days') AND is_active = 1`,
          [],
          (err, row: any) => {
            if (err) rej(err);
            else res(row?.count || 0);
          }
        );
      });

      resolve({
        ...basicStats,
        usagePercent,
        byDiscountType: byDiscountType.map((d) => ({
          type: getDiscountTypeText(d.type),
          count: d.count,
          totalValue: d.totalValue || 0,
        })),
        topPromos: topPromos.map((p) => ({
          code: p.code,
          used: p.used || 0,
          description: p.description,
        })),
        avgUsage,
        createdToday,
        createdThisWeek,
      });
    } catch (error) {
      logger.error(
        'Error getting extended promo stats',
        error instanceof Error ? error : new Error(String(error))
      );
      reject(error);
    }
  });
};

/**
 * Deactivates a promo code (makes it unusable)
 *
 * @param promoCodeId - ID of the promo code to deactivate
 * @returns Promise resolving when deactivation is complete
 * @throws Error if database operation fails
 */
export const deactivatePromoCode = (promoCodeId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run('UPDATE promo_codes SET is_active = 0 WHERE id = ?', [promoCodeId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

/**
 * Permanently deletes a promo code from the database
 *
 * @param promoCodeId - ID of the promo code to delete
 * @returns Promise resolving when deletion is complete
 * @throws Error if database operation fails
 *
 * @warning This operation cannot be undone and will also remove all usage records
 */
export const deletePromoCode = (promoCodeId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM promo_codes WHERE id = ?', [promoCodeId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

/**
 * Gets human-readable text description for a discount type
 *
 * @param discountType - The discount type identifier
 * @returns Human-readable description of the discount type
 *
 * @example
 * ```typescript
 * console.log(getDiscountTypeText('percentage')); // "Відсоткова знижка"
 * console.log(getDiscountTypeText('shipping')); // "Безкоштовна доставка"
 * ```
 */
export const getDiscountTypeText = (discountType: string): string => {
  switch (discountType) {
    case 'percentage':
      return 'Відсоткова знижка';
    case 'fixed':
      return 'Фіксована знижка';
    case 'shipping':
      return 'Безкоштовна доставка';
    default:
      return 'Знижка';
  }
};
