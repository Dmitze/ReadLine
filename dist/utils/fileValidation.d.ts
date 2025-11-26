export declare const MAX_FILE_SIZES: {
    readonly PHOTO: number;
    readonly DOCUMENT: number;
    readonly AUDIO: any;
};
export declare const ALLOWED_MIME_TYPES: {
    readonly PHOTO: readonly ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    readonly DOCUMENT: readonly ["application/pdf", "application/epub+zip", "application/x-mobipocket-ebook", "application/x-fictionbook+xml", "application/octet-stream"];
    readonly AUDIO: readonly ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/ogg"];
};
export declare const ALLOWED_EXTENSIONS: {
    readonly PHOTO: readonly [".jpg", ".jpeg", ".png", ".webp"];
    readonly DOCUMENT: readonly [".pdf", ".epub", ".mobi", ".fb2"];
    readonly AUDIO: readonly [".mp3", ".m4a", ".ogg"];
};
export interface FileValidationResult {
    isValid: boolean;
    error?: string;
    fileSize?: number;
    fileSizeMB?: string;
}
export declare function validatePhoto(fileSize?: number, mimeType?: string, fileName?: string): FileValidationResult;
export declare function validateDocument(fileSize?: number, mimeType?: string, fileName?: string): FileValidationResult;
export declare function validateAudio(fileSize?: number, mimeType?: string, fileName?: string): FileValidationResult;
export declare function formatFileSize(bytes: number): string;
export declare function isImageFile(fileName?: string, mimeType?: string): boolean;
export declare function isDocumentFile(fileName?: string, mimeType?: string): boolean;
export declare function isAudioFile(fileName?: string, mimeType?: string): boolean;
//# sourceMappingURL=fileValidation.d.ts.map