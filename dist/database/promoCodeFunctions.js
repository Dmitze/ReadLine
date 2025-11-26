"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDiscountTypeText = exports.deletePromoCode = exports.deactivatePromoCode = exports.getExtendedPromoStats = exports.getPromoCodeStats = exports.getAllPromoCodes = exports.getAllPromoCodesCount = exports.getAvailablePromoCodesCount = exports.getAvailablePromoCodeForUser = exports.returnPromoCode = exports.getUserPromoCode = exports.markPromoCodeAsUsed = exports.hasUserReceivedPromoCode = exports.getAvailablePromoCode = exports.getPromoCodeByCode = exports.addPromoCode = void 0;
const models_1 = require("./models");
const logger_1 = require("../utils/logger");
const addPromoCode = (code, adminId) => {
    return new Promise((resolve, reject) => {
        const details = generatePromoCodeDetails(code);
        const query = `
      INSERT INTO promo_codes (code, description, promo_type, created_by)
      VALUES (?, ?, ?, ?)
    `;
        models_1.db.run(query, [code.toUpperCase(), details.description, details.promo_type, adminId || null], function (err) {
            if (err) {
                logger_1.logger.error('Error adding promo code', err, { code });
                reject(err);
            }
            else {
                logger_1.logger.info('Promo code added', { code, id: this.lastID });
                resolve(this.lastID);
            }
        });
    });
};
exports.addPromoCode = addPromoCode;
function generatePromoCodeDetails(_code) {
    return {
        description: '📚 Промокод на доступ до Yakaboo Unlimited',
        promo_type: 'yakaboo_unlimited',
    };
}
const getPromoCodeByCode = (code) => {
    return new Promise((resolve, reject) => {
        models_1.db.get('SELECT * FROM promo_codes WHERE code = ?', [code.toUpperCase()], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
};
exports.getPromoCodeByCode = getPromoCodeByCode;
const getAvailablePromoCode = (userId) => {
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
        models_1.db.get(query, [userId], (err, row) => {
            if (err) {
                logger_1.logger.error('Error getting available promo code', err, { userId });
                reject(err);
            }
            else {
                resolve(row);
            }
        });
    });
};
exports.getAvailablePromoCode = getAvailablePromoCode;
const hasUserReceivedPromoCode = (userId) => {
    return new Promise((resolve, reject) => {
        models_1.db.get('SELECT 1 FROM used_promo_codes WHERE user_id = ? LIMIT 1', [userId], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(!!row);
        });
    });
};
exports.hasUserReceivedPromoCode = hasUserReceivedPromoCode;
const markPromoCodeAsUsed = (userId, promoCodeId) => {
    return new Promise((resolve, reject) => {
        models_1.db.run('INSERT INTO used_promo_codes (user_id, promo_code_id) VALUES (?, ?)', [userId, promoCodeId], (err) => {
            if (err) {
                logger_1.logger.error('Error marking promo code as used', err, { userId, promoCodeId });
                reject(err);
            }
            else {
                logger_1.logger.info('Promo code marked as used', { userId, promoCodeId });
                resolve();
            }
        });
    });
};
exports.markPromoCodeAsUsed = markPromoCodeAsUsed;
const getUserPromoCode = (userId) => {
    return new Promise((resolve, reject) => {
        models_1.db.get(`SELECT pc.* FROM promo_codes pc
       INNER JOIN used_promo_codes upc ON pc.id = upc.promo_code_id
       WHERE upc.user_id = ?`, [userId], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
};
exports.getUserPromoCode = getUserPromoCode;
const returnPromoCode = (userId) => {
    return new Promise((resolve, reject) => {
        models_1.db.run('DELETE FROM used_promo_codes WHERE user_id = ?', [userId], function (err) {
            if (err) {
                logger_1.logger.error('Error returning promo code', err, { userId });
                reject(err);
            }
            else {
                logger_1.logger.info('Promo code returned', { userId, changes: this.changes });
                resolve(this.changes > 0);
            }
        });
    });
};
exports.returnPromoCode = returnPromoCode;
const getAvailablePromoCodeForUser = () => {
    return new Promise((resolve, reject) => {
        models_1.db.get(`SELECT * FROM promo_codes 
       WHERE is_active = 1 
       AND id NOT IN (SELECT promo_code_id FROM used_promo_codes)
       LIMIT 1`, [], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
};
exports.getAvailablePromoCodeForUser = getAvailablePromoCodeForUser;
const getAvailablePromoCodesCount = () => {
    return new Promise((resolve, reject) => {
        const query = `
      SELECT COUNT(*) as count
      FROM promo_codes pc
      WHERE pc.is_active = 1
      AND pc.id NOT IN (SELECT promo_code_id FROM used_promo_codes)
    `;
        models_1.db.get(query, [], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row?.count || 0);
        });
    });
};
exports.getAvailablePromoCodesCount = getAvailablePromoCodesCount;
const getAllPromoCodesCount = () => {
    return new Promise((resolve, reject) => {
        models_1.db.get('SELECT COUNT(*) as count FROM promo_codes WHERE is_active = 1', [], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row?.count || 0);
        });
    });
};
exports.getAllPromoCodesCount = getAllPromoCodesCount;
const getAllPromoCodes = () => {
    return new Promise((resolve, reject) => {
        models_1.db.all('SELECT * FROM promo_codes ORDER BY created_at DESC', [], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getAllPromoCodes = getAllPromoCodes;
const getPromoCodeStats = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const total = await (0, exports.getAllPromoCodesCount)();
            const available = await (0, exports.getAvailablePromoCodesCount)();
            const usedResult = await new Promise((res, rej) => {
                models_1.db.get('SELECT COUNT(*) as count FROM used_promo_codes', [], (err, row) => {
                    if (err)
                        rej(err);
                    else
                        res(row);
                });
            });
            const usedByUsersResult = await new Promise((res, rej) => {
                models_1.db.get('SELECT COUNT(DISTINCT user_id) as count FROM used_promo_codes', [], (err, row) => {
                    if (err)
                        rej(err);
                    else
                        res(row);
                });
            });
            resolve({
                total,
                available,
                used: usedResult?.count || 0,
                usedByUsers: usedByUsersResult?.count || 0,
            });
        }
        catch (error) {
            reject(error);
        }
    });
};
exports.getPromoCodeStats = getPromoCodeStats;
const getExtendedPromoStats = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const basicStats = await (0, exports.getPromoCodeStats)();
            const usagePercent = basicStats.total > 0 ? Math.round((basicStats.used / basicStats.total) * 100) : 0;
            const avgUsage = basicStats.used > 0 ? Math.round(basicStats.used / basicStats.usedByUsers) : 0;
            const byDiscountType = await new Promise((res, rej) => {
                models_1.db.all(`SELECT promo_type as type, COUNT(*) as count, COUNT(*) as totalValue 
           FROM promo_codes 
           WHERE is_active = 1
           GROUP BY promo_type`, [], (err, rows) => {
                    if (err)
                        rej(err);
                    else
                        res(rows || []);
                });
            });
            const topPromos = await new Promise((res, rej) => {
                models_1.db.all(`SELECT pc.code, pc.description, COUNT(upc.id) as used
           FROM promo_codes pc
           LEFT JOIN used_promo_codes upc ON pc.id = upc.promo_code_id
           WHERE pc.is_active = 1
           GROUP BY pc.id
           ORDER BY used DESC
           LIMIT 5`, [], (err, rows) => {
                    if (err)
                        rej(err);
                    else
                        res(rows || []);
                });
            });
            const createdToday = await new Promise((res, rej) => {
                models_1.db.get(`SELECT COUNT(*) as count FROM promo_codes 
           WHERE DATE(created_at) = DATE('now') AND is_active = 1`, [], (err, row) => {
                    if (err)
                        rej(err);
                    else
                        res(row?.count || 0);
                });
            });
            const createdThisWeek = await new Promise((res, rej) => {
                models_1.db.get(`SELECT COUNT(*) as count FROM promo_codes 
           WHERE datetime(created_at) > datetime('now', '-7 days') AND is_active = 1`, [], (err, row) => {
                    if (err)
                        rej(err);
                    else
                        res(row?.count || 0);
                });
            });
            resolve({
                ...basicStats,
                usagePercent,
                byDiscountType: byDiscountType.map((d) => ({
                    type: (0, exports.getDiscountTypeText)(d.type),
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
        }
        catch (error) {
            logger_1.logger.error('Error getting extended promo stats', error instanceof Error ? error : new Error(String(error)));
            reject(error);
        }
    });
};
exports.getExtendedPromoStats = getExtendedPromoStats;
const deactivatePromoCode = (promoCodeId) => {
    return new Promise((resolve, reject) => {
        models_1.db.run('UPDATE promo_codes SET is_active = 0 WHERE id = ?', [promoCodeId], (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
};
exports.deactivatePromoCode = deactivatePromoCode;
const deletePromoCode = (promoCodeId) => {
    return new Promise((resolve, reject) => {
        models_1.db.run('DELETE FROM promo_codes WHERE id = ?', [promoCodeId], (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
};
exports.deletePromoCode = deletePromoCode;
const getDiscountTypeText = (promoType) => {
    switch (promoType) {
        case 'yakaboo_unlimited':
            return '📚 Якабу Unlimited';
        default:
            return '📚 Промокод';
    }
};
exports.getDiscountTypeText = getDiscountTypeText;
//# sourceMappingURL=promoCodeFunctions.js.map