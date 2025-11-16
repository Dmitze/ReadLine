/**
 * Promo Code Functions - функції для роботи з промокодами
 */

import { db } from './models';
import { logger } from '../utils/logger';

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

export interface UsedPromoCode {
  id?: number;
  user_id: number;
  promo_code_id: number;
  used_at?: string;
}

/**
 * Додати новий промокод
 */
export const addPromoCode = (code: string, adminId?: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const details = generatePromoCodeDetails(code);

    const query = `
      INSERT INTO promo_codes (code, description, discount_type, discount_value, created_by)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.run(
      query,
      [
        code.toUpperCase(),
        details.description,
        details.discount_type,
        details.discount_value,
        adminId || null,
      ],
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
 * Автоматична генерація деталей промокоду на основі коду
 */
function generatePromoCodeDetails(code: string): {
  description: string;
  discount_type: 'percentage' | 'fixed' | 'shipping';
  discount_value: number;
} {
  const codeUpper = code.toUpperCase();

  // Вітальні промокоди
  if (codeUpper.includes('WELCOME') || codeUpper.includes('NEW') || codeUpper.includes('HELLO')) {
    return {
      description: '🎉 Вітальний промокод - знижка 15% на перше замовлення на Yakaboo.ua',
      discount_type: 'percentage',
      discount_value: 15,
    };
  }

  // Сезонні промокоди
  if (codeUpper.includes('SUMMER') || codeUpper.includes('ЛІТО')) {
    return {
      description: '☀️ Літня знижка - спеціальна пропозиція 20% на Yakaboo.ua',
      discount_type: 'percentage',
      discount_value: 20,
    };
  }

  if (codeUpper.includes('SPRING') || codeUpper.includes('ВЕСНА')) {
    return {
      description: '🌸 Весняна знижка - спеціальна пропозиція 20% на Yakaboo.ua',
      discount_type: 'percentage',
      discount_value: 20,
    };
  }

  if (codeUpper.includes('WINTER') || codeUpper.includes('ЗИМА')) {
    return {
      description: '❄️ Зимова знижка - спеціальна пропозиція 20% на Yakaboo.ua',
      discount_type: 'percentage',
      discount_value: 20,
    };
  }

  if (codeUpper.includes('AUTUMN') || codeUpper.includes('FALL') || codeUpper.includes('ОСІНЬ')) {
    return {
      description: '🍂 Осіння знижка - спеціальна пропозиція 20% на Yakaboo.ua',
      discount_type: 'percentage',
      discount_value: 20,
    };
  }

  // Безкоштовна доставка
  if (codeUpper.includes('SHIP') || codeUpper.includes('DELIVERY') || codeUpper.includes('FREE')) {
    return {
      description: '🚚 Безкоштовна доставка для вашого замовлення на Yakaboo.ua',
      discount_type: 'shipping',
      discount_value: 0,
    };
  }

  // Студентські промокоди
  if (codeUpper.includes('STUDENT') || codeUpper.includes('СТУДЕНТ')) {
    return {
      description: '🎓 Студентська знижка 15% на Yakaboo.ua',
      discount_type: 'percentage',
      discount_value: 15,
    };
  }

  // Промокоди з числами (витягуємо відсоток)
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

  // За замовчуванням
  return {
    description: '🎁 Спеціальна знижка 10% за промокодом на Yakaboo.ua',
    discount_type: 'percentage',
    discount_value: 10,
  };
}

/**
 * Отримати промокод за кодом
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
 * Отримати доступний промокод для користувача
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
 * Перевірити чи користувач вже отримував промокод
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
 * Позначити промокод як використаний
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
 * Отримати кількість доступних промокодів
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
 * Отримати загальну кількість промокодів
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
 * Отримати всі промокоди (для адміна)
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
 * Деактивувати промокод
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
 * Видалити промокод
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
 * Отримати текстовий опис типу знижки
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
