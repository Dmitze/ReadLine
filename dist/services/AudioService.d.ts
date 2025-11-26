import { AudioRepository } from '../repositories/AudioRepository';
import { BookRepository } from '../repositories/BookRepository';
import { Result } from '../core/Result';
export interface CreateAudioInput {
    book_id: number;
    file_id: string;
    duration: number;
    narrator?: string;
    quality?: 'low' | 'medium' | 'high';
}
export interface UpdateAudioInput {
    duration?: number;
    narrator?: string;
    quality?: 'low' | 'medium' | 'high';
}
export declare class AudioService {
    private audioRepository;
    private bookRepository;
    constructor(audioRepository: AudioRepository, bookRepository: BookRepository);
    addAudioVersion(input: CreateAudioInput): Promise<Result<number>>;
    getAudioById(audioId: number): Promise<Result<any>>;
    getBookAudio(bookId: number): Promise<Result<any[]>>;
    updateAudio(audioId: number, input: UpdateAudioInput): Promise<Result<void>>;
    deleteAudio(audioId: number): Promise<Result<void>>;
    getAudioByNarrator(narrator: string): Promise<Result<any[]>>;
    getAudioByQuality(quality: 'low' | 'medium' | 'high'): Promise<Result<any[]>>;
    getTotalAudioDuration(): Promise<Result<number>>;
    getAudioStats(): Promise<Result<any>>;
}
//# sourceMappingURL=AudioService.d.ts.map