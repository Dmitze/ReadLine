import { BaseRepository } from './BaseRepository';
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
export declare class PromoCodeRepository extends BaseRepository<PromoCode> {
    constructor(db: any);
    createPromoCode(code: string, adminId?: number): Promise<number>;
    getPromoCodeByCode(code: string): Promise<PromoCode | null>;
    getPromoCodeById(promoCodeId: number): Promise<PromoCode | null>;
    getAvailablePromoCode(userId: number): Promise<PromoCode | null>;
    hasUserReceivedPromoCode(userId: number): Promise<boolean>;
    markPromoCodeAsUsed(userId: number, promoCodeId: number): Promise<void>;
    getActivePromoCodes(): Promise<PromoCode[]>;
    getAllPromoCodes(): Promise<PromoCode[]>;
    getAvailablePromoCodesCount(): Promise<number>;
    getPromoCodesCount(): Promise<number>;
    getPromoCodeStats(): Promise<{
        total: number;
        available: number;
        used: number;
        usedByUsers: number;
    }>;
    getPromoCodeUsageCount(promoCodeId: number): Promise<number>;
    deactivatePromoCode(promoCodeId: number): Promise<void>;
    activatePromoCode(promoCodeId: number): Promise<void>;
    updatePromoCode(promoCodeId: number, updates: Partial<PromoCode>): Promise<number>;
    deletePromoCode(promoCodeId: number): Promise<void>;
    canUserUsePromoCode(userId: number, code: string): Promise<boolean>;
    getUserUsedPromoCodes(userId: number): Promise<PromoCode[]>;
    getPromoTypeText(): string;
    getUserPromoCode(userId: number): Promise<PromoCode | null>;
    returnPromoCode(userId: number): Promise<boolean>;
    getAvailablePromoCodeForUser(): Promise<PromoCode | null>;
    private generatePromoCodeDetails;
    getMostUsedPromoCodes(limit?: number): Promise<Array<PromoCode & {
        usage_count: number;
    }>>;
    getPromoCodeUsers(promoCodeId: number): Promise<number[]>;
}
//# sourceMappingURL=PromoCodeRepository.d.ts.map