import { Admin, AdminStats, ExtendedAdminStats } from './types';
export declare const addAdmin: (userId: number, username?: string) => Promise<number>;
export declare const isAdmin: (userId: number) => Promise<boolean>;
export declare const getAllAdmins: () => Promise<Admin[]>;
export declare const getAdminStats: () => Promise<AdminStats>;
export declare const getExtendedAdminStats: () => Promise<ExtendedAdminStats>;
export declare const removeAdmin: (userId: number) => Promise<number>;
//# sourceMappingURL=admins.d.ts.map