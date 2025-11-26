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
export declare const addPromoCode: (code: string, adminId?: number) => Promise<number>;
export declare const getPromoCodeByCode: (code: string) => Promise<PromoCode | undefined>;
export declare const getAvailablePromoCode: (userId: number) => Promise<PromoCode | undefined>;
export declare const hasUserReceivedPromoCode: (userId: number) => Promise<boolean>;
export declare const markPromoCodeAsUsed: (userId: number, promoCodeId: number) => Promise<void>;
export declare const getUserPromoCode: (userId: number) => Promise<PromoCode | undefined>;
export declare const returnPromoCode: (userId: number) => Promise<boolean>;
export declare const getAvailablePromoCodeForUser: () => Promise<PromoCode | undefined>;
export declare const getAvailablePromoCodesCount: () => Promise<number>;
export declare const getAllPromoCodesCount: () => Promise<number>;
export declare const getAllPromoCodes: () => Promise<PromoCode[]>;
export declare const getPromoCodeStats: () => Promise<{
    total: number;
    available: number;
    used: number;
    usedByUsers: number;
}>;
export declare const getExtendedPromoStats: () => Promise<{
    total: number;
    available: number;
    used: number;
    usedByUsers: number;
    usagePercent: number;
    byDiscountType: {
        type: string;
        count: number;
        totalValue: number;
    }[];
    topPromos: {
        code: string;
        used: number;
        description: string;
    }[];
    avgUsage: number;
    createdToday: number;
    createdThisWeek: number;
}>;
export declare const deactivatePromoCode: (promoCodeId: number) => Promise<void>;
export declare const deletePromoCode: (promoCodeId: number) => Promise<void>;
export declare const getDiscountTypeText: (promoType: string) => string;
//# sourceMappingURL=promoCodeFunctions.d.ts.map