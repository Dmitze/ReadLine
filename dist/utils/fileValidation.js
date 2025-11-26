"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_EXTENSIONS = exports.ALLOWED_MIME_TYPES = exports.MAX_FILE_SIZES = void 0;
exports.validatePhoto = validatePhoto;
exports.validateDocument = validateDocument;
exports.validateAudio = validateAudio;
exports.formatFileSize = formatFileSize;
exports.isImageFile = isImageFile;
exports.isDocumentFile = isDocumentFile;
exports.isAudioFile = isAudioFile;
exports.MAX_FILE_SIZES = {
    PHOTO: 10 * 1024 * 1024,
    DOCUMENT: 50 * 1024 * 1024,
    AUDIO: null,
};
exports.ALLOWED_MIME_TYPES = {
    PHOTO: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    DOCUMENT: [
        'application/pdf',
        'application/epub+zip',
        'application/x-mobipocket-ebook',
        'application/x-fictionbook+xml',
        'application/octet-stream',
    ],
    AUDIO: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/ogg'],
};
exports.ALLOWED_EXTENSIONS = {
    PHOTO: ['.jpg', '.jpeg', '.png', '.webp'],
    DOCUMENT: ['.pdf', '.epub', '.mobi', '.fb2'],
    AUDIO: ['.mp3', '.m4a', '.ogg'],
};
function validatePhoto(fileSize, mimeType, fileName) {
    return {
        isValid: true,
        fileSize,
        fileSizeMB: fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : undefined,
    };
}
function validateDocument(fileSize, mimeType, fileName) {
    return {
        isValid: true,
        fileSize,
        fileSizeMB: fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : undefined,
    };
}
function validateAudio(fileSize, mimeType, fileName) {
    return {
        isValid: true,
        fileSize,
        fileSizeMB: fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : undefined,
    };
}
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
function isImageFile(fileName, mimeType) {
    if (mimeType && exports.ALLOWED_MIME_TYPES.PHOTO.includes(mimeType)) {
        return true;
    }
    if (fileName) {
        const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        return exports.ALLOWED_EXTENSIONS.PHOTO.includes(ext);
    }
    return false;
}
function isDocumentFile(fileName, mimeType) {
    if (mimeType && exports.ALLOWED_MIME_TYPES.DOCUMENT.includes(mimeType)) {
        return true;
    }
    if (fileName) {
        const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        return exports.ALLOWED_EXTENSIONS.DOCUMENT.includes(ext);
    }
    return false;
}
function isAudioFile(fileName, mimeType) {
    if (mimeType && exports.ALLOWED_MIME_TYPES.AUDIO.includes(mimeType)) {
        return true;
    }
    if (fileName) {
        const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        return exports.ALLOWED_EXTENSIONS.AUDIO.includes(ext);
    }
    return false;
}
//# sourceMappingURL=fileValidation.js.map