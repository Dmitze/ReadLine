"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioService = void 0;
const Result_1 = require("../core/Result");
class AudioService {
    constructor(audioRepository, bookRepository) {
        this.audioRepository = audioRepository;
        this.bookRepository = bookRepository;
    }
    async addAudioVersion(input) {
        try {
            const book = await this.bookRepository.findById(input.book_id);
            if (!book) {
                return new Result_1.Err(new Error(`Book with id ${input.book_id} not found`));
            }
            if (!input.file_id) {
                return new Result_1.Err(new Error('Audio file_id is required'));
            }
            if (input.duration <= 0) {
                return new Result_1.Err(new Error('Duration must be greater than 0'));
            }
            const audioId = await this.audioRepository.insert({
                book_id: input.book_id,
                chapter_number: 1,
                title: `Audio ${input.file_id}`,
                file_id: input.file_id,
                duration: input.duration,
            });
            return new Result_1.Ok(audioId);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to add audio version'));
        }
    }
    async getAudioById(audioId) {
        try {
            const audio = await this.audioRepository.findById(audioId);
            if (!audio) {
                return new Result_1.Err(new Error(`Audio with id ${audioId} not found`));
            }
            return new Result_1.Ok(audio);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch audio'));
        }
    }
    async getBookAudio(bookId) {
        try {
            const book = await this.bookRepository.findById(bookId);
            if (!book) {
                return new Result_1.Err(new Error(`Book with id ${bookId} not found`));
            }
            const audioVersions = await this.audioRepository.findByBookId(bookId);
            return new Result_1.Ok(audioVersions);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch audio versions'));
        }
    }
    async updateAudio(audioId, input) {
        try {
            const audio = await this.audioRepository.findById(audioId);
            if (!audio) {
                return new Result_1.Err(new Error(`Audio with id ${audioId} not found`));
            }
            if (input.duration && input.duration <= 0) {
                return new Result_1.Err(new Error('Duration must be greater than 0'));
            }
            await this.audioRepository.update(audioId, {
                duration: input.duration || audio.duration,
            });
            return new Result_1.Ok(undefined);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to update audio'));
        }
    }
    async deleteAudio(audioId) {
        try {
            const audio = await this.audioRepository.findById(audioId);
            if (!audio) {
                return new Result_1.Err(new Error(`Audio with id ${audioId} not found`));
            }
            await this.audioRepository.delete(audioId);
            return new Result_1.Ok(undefined);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to delete audio'));
        }
    }
    async getAudioByNarrator(narrator) {
        try {
            const audioVersions = await this.audioRepository.findByNarrator(narrator);
            return new Result_1.Ok(audioVersions);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch audio by narrator'));
        }
    }
    async getAudioByQuality(quality) {
        try {
            const audioVersions = await this.audioRepository.findByQuality(quality);
            return new Result_1.Ok(audioVersions);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch audio by quality'));
        }
    }
    async getTotalAudioDuration() {
        try {
            const allAudio = await this.audioRepository.findAll();
            const totalDuration = allAudio.reduce((sum, a) => sum + (a.duration || 0), 0);
            return new Result_1.Ok(totalDuration);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to calculate total duration'));
        }
    }
    async getAudioStats() {
        try {
            const allAudio = await this.audioRepository.findAll();
            const totalDuration = allAudio.reduce((sum, a) => sum + (a.duration || 0), 0);
            return new Result_1.Ok({
                total_count: allAudio.length,
                total_duration: totalDuration,
                average_duration: allAudio.length > 0 ? totalDuration / allAudio.length : 0,
            });
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch audio statistics'));
        }
    }
}
exports.AudioService = AudioService;
//# sourceMappingURL=AudioService.js.map