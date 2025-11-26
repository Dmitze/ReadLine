import { Scenes } from 'telegraf';
export type BotContext = any;
export interface SessionData {
    __scenes?: Scenes.WizardSessionData;
    userId?: number;
    isAdmin?: boolean;
}
export interface WizardState {
    title?: string;
    author?: string;
    genre?: string;
    description?: string;
    photoFileId?: string;
    bookType?: string;
    fileUrl?: string;
    fileName?: string;
    selectedFormats?: string[];
    pdfFileId?: string;
    externalLink?: string;
    audioFileId?: string;
    audioDuration?: number;
    narrator?: string;
    selectedTags?: number[];
    savedBookId?: number;
    editingField?: 'title' | 'author' | 'description';
    bookFile?: string;
    bookFileName?: string;
    bookAudio?: string;
    bookAudioName?: string;
    bookLink?: string;
    selectedGenres?: string[];
    addingAdditionalFormat?: boolean;
    is_physically_available?: boolean;
    isbn?: string;
    language?: string;
    useAI?: boolean;
    aiRecognized?: boolean;
    awaitingDescriptionFix?: boolean;
    aiSuggestedTags?: string[];
    waitingForCustomMood?: boolean;
    aiInterest?: string;
    aiLength?: string;
    aiMood?: string;
    bookId?: number;
    fullName?: string;
    unit?: string;
    phone?: string;
    rating?: number;
    comment?: string;
    [key: string]: any;
}
export type CallbackAction = `order_${number}` | `save_${number}` | `download_${number}` | `reviews_${number}` | `similar_${number}` | `rate_${number}` | `approve_${number}` | `reject_${number}` | `publish_review_${number}` | `delete_review_${number}` | 'view_requests' | 'add_book' | 'admin_stats' | 'moderate_reviews';
//# sourceMappingURL=telegraf.d.ts.map