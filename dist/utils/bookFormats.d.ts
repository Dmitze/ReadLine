import { Book } from '../database/models';
export interface BookFormats {
    hasPDF: boolean;
    hasLink: boolean;
    hasAudio: boolean;
    formats: string[];
}
export declare function getBookFormats(book: Book): BookFormats;
export declare function getFormatsDescription(book: Book): string;
export declare function formatDuration(seconds: number): string;
export declare function hasAnyDigitalFormat(book: Book): boolean;
//# sourceMappingURL=bookFormats.d.ts.map