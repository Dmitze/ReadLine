import { DeviceType } from '../keyboards/mainKeyboards';
export declare const getUserKeyboardPreference: (userId: number) => DeviceType;
export declare const setUserKeyboardPreference: (userId: number, deviceType: DeviceType) => boolean;
export declare const ensureKeyboardTypeColumn: () => Promise<void>;
//# sourceMappingURL=userPreferences.d.ts.map