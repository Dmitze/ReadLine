export interface Podcast {
    id?: number;
    theme: string;
    description: string;
    file_type: 'audio' | 'link' | 'archive';
    file_url?: string;
    file_id?: string;
    file_name?: string;
    file_size?: number;
    duration?: number;
    cover_photo_id?: string;
    rating?: number;
    listens_count?: number;
    is_available?: boolean;
    created_at?: string;
    created_by?: number;
    updated_at?: string;
}
export interface PodcastReview {
    id?: number;
    podcast_id: number;
    user_id: number;
    rating: number;
    comment?: string;
    is_published?: boolean;
    created_at?: string;
}
export interface PodcastListen {
    id?: number;
    podcast_id: number;
    user_id: number;
    listened_at?: string;
}
export declare const addPodcast: (podcast: Podcast) => Promise<number>;
export declare const getAllPodcasts: () => Promise<Podcast[]>;
export declare const getAllPodcastsWithPagination: (limit?: number, offset?: number) => Promise<{
    podcasts: Podcast[];
    total: number;
}>;
export declare const getPodcastById: (podcastId: number) => Promise<Podcast | undefined>;
export declare const incrementPodcastListens: (podcastId: number, userId: number) => Promise<void>;
export declare const addPodcastReview: (review: PodcastReview) => Promise<number>;
export declare const getPodcastReviews: (podcastId: number) => Promise<PodcastReview[]>;
export declare const deletePodcast: (podcastId: number) => Promise<void>;
export declare const updatePodcast: (podcastId: number, updates: Partial<Podcast>) => Promise<void>;
//# sourceMappingURL=podcasts.d.ts.map