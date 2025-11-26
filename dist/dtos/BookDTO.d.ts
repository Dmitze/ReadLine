export interface CreateBookDTO {
    title: string;
    author: string;
    description?: string;
    genre: string;
    cover_url?: string;
    pdf_url?: string;
    epub_url?: string;
    is_available?: boolean;
    rating?: number;
    download_count?: number;
}
export declare class CreateBookDTOClass implements CreateBookDTO {
    title: string;
    author: string;
    description?: string;
    genre: string;
    cover_url?: string;
    pdf_url?: string;
    epub_url?: string;
    is_available?: boolean;
    rating?: number;
    download_count?: number;
    constructor(data: CreateBookDTO);
}
export interface UpdateBookDTO {
    title?: string;
    author?: string;
    description?: string;
    genre?: string;
    cover_url?: string;
    pdf_url?: string;
    epub_url?: string;
    is_available?: boolean;
    rating?: number;
    download_count?: number;
}
export declare class UpdateBookDTOClass implements UpdateBookDTO {
    title?: string;
    author?: string;
    description?: string;
    genre?: string;
    cover_url?: string;
    pdf_url?: string;
    epub_url?: string;
    is_available?: boolean;
    rating?: number;
    download_count?: number;
    constructor(data: UpdateBookDTO);
}
export interface BookResponseDTO {
    id: number;
    title: string;
    author: string;
    description?: string;
    genre: string;
    cover_url?: string;
    pdf_url?: string;
    epub_url?: string;
    is_available: boolean;
    rating: number;
    download_count: number;
    created_at?: string;
    updated_at?: string;
}
export interface BookListItemDTO {
    id: number;
    title: string;
    author: string;
    genre: string;
    cover_url?: string;
    rating: number;
    download_count: number;
}
export interface BookWithRatingDTO extends BookResponseDTO {
    average_rating: number;
    review_count: number;
    user_rating?: number;
    is_saved?: boolean;
}
export interface BookSearchDTO {
    query?: string;
    genre?: string;
    author?: string;
    limit?: number;
    offset?: number;
    sort_by?: 'title' | 'rating' | 'downloads' | 'recent';
    order?: 'asc' | 'desc';
}
export interface BookStatsDTO {
    total_books: number;
    available_books: number;
    genres: Array<{
        name: string;
        count: number;
    }>;
    top_authors: Array<{
        name: string;
        book_count: number;
    }>;
    average_rating: number;
    total_downloads: number;
}
export interface GenreFilterDTO {
    genre: string;
    limit?: number;
    offset?: number;
    sort_by?: 'rating' | 'downloads' | 'title';
}
export interface SaveBookDTO {
    user_id: number;
    book_id: number;
}
export interface BookDownloadDTO {
    book_id: number;
    user_id: number;
    download_time: string;
    format: 'pdf' | 'epub' | 'other';
}
//# sourceMappingURL=BookDTO.d.ts.map