import { FeedbackMessage } from './types';
export declare const addFeedbackMessage: (feedbackData: Omit<FeedbackMessage, "id" | "status" | "created_at" | "read_at">) => Promise<number>;
export declare const getPendingFeedbackMessages: () => Promise<FeedbackMessage[]>;
export declare const getAllFeedbackMessages: () => Promise<FeedbackMessage[]>;
export declare const updateFeedbackStatus: (feedbackId: number, status: string) => Promise<number>;
export declare const addAdminReply: (feedbackId: number, reply: string) => Promise<void>;
export declare const deleteFeedback: (feedbackId: number) => Promise<number>;
//# sourceMappingURL=feedback.d.ts.map