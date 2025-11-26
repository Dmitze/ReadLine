import { BaseRepository } from './BaseRepository';
export interface AudioChapter {
    id?: number;
    book_id: number;
    chapter_number: number;
    title: string;
    file_id: string;
    duration: number;
    created_at?: string;
}
export interface ListeningProgress {
    id?: number;
    user_id: number;
    book_id: number;
    chapter_id?: number;
    position: number;
    total_listened: number;
    last_listened_at?: string;
    created_at?: string;
}
export declare class AudioRepository extends BaseRepository<AudioChapter> {
    constructor(db: any);
    createChapter(chapter: AudioChapter): Promise<number>;
    getBookChapters(bookId: number): Promise<AudioChapter[]>;
    getChapterById(chapterId: number): Promise<AudioChapter | null>;
    updateChapter(chapterId: number, updates: Partial<AudioChapter>): Promise<number>;
    deleteChapter(chapterId: number): Promise<number>;
    getChapterCount(bookId: number): Promise<number>;
    saveListeningProgress(progress: ListeningProgress): Promise<void>;
    getListeningProgress(userId: number, bookId: number): Promise<ListeningProgress | null>;
    getUserListeningProgress(userId: number): Promise<ListeningProgress[]>;
    getUserTotalListeningTime(userId: number): Promise<number>;
    getMostListenedAudiobooks(limit?: number): Promise<Array<any>>;
    getUserListeningStats(userId: number): Promise<{
        totalTime: number;
        booksListened: number;
        averageTimePerBook: number;
    }>;
    deleteListeningProgress(userId: number, bookId: number): Promise<void>;
    getBooksWithAudio(limit?: number): Promise<Array<any>>;
    getBookTotalDuration(bookId: number): Promise<number>;
    getUserBookPosition(userId: number, bookId: number): Promise<{
        chapterId: number | null;
        position: number;
    } | null>;
    clearUserListeningProgress(userId: number): Promise<void>;
    findById(id: number): Promise<AudioChapter | undefined>;
    findByBookId(bookId: number): Promise<AudioChapter[]>;
    findByNarrator(_narrator: string): Promise<AudioChapter[]>;
    findByQuality(_quality: string): Promise<AudioChapter[]>;
    findAll(limit?: number, offset?: number): Promise<AudioChapter[]>;
}
//# sourceMappingURL=AudioRepository.d.ts.map