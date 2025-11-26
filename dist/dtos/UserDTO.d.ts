export interface CreateUserDTO {
    user_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    is_admin?: boolean;
    favorite_genres?: string[];
    language?: string;
}
export interface UpdateUserDTO {
    username?: string;
    first_name?: string;
    last_name?: string;
    is_admin?: boolean;
    favorite_genres?: string[];
    language?: string;
    last_seen?: string;
}
export interface UserResponseDTO {
    id: number;
    user_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    is_admin: boolean;
    is_new: boolean;
    favorite_genres: string[];
    language: string;
    created_at?: string;
    updated_at?: string;
    last_seen?: string;
}
export interface UserStatsDTO {
    id: number;
    username?: string;
    favorite_genres: string[];
    saved_books_count: number;
    reviews_count: number;
    downloaded_books_count: number;
    is_admin: boolean;
}
export interface UserLibraryDTO {
    user_id: number;
    saved_books: Array<{
        id: number;
        title: string;
        author: string;
        genre: string;
        rating: number;
        saved_at: string;
    }>;
    total_saved: number;
}
export interface UpdateUserPreferencesDTO {
    favorite_genres?: string[];
    language?: string;
    notification_enabled?: boolean;
    notification_frequency?: 'daily' | 'weekly' | 'monthly' | 'never';
    notification_time?: string;
}
export interface UserPreferencesDTO {
    user_id: number;
    favorite_genres: string[];
    language: string;
    notification_enabled: boolean;
    notification_frequency: string;
    notification_time: string;
}
export interface UserSearchDTO {
    query?: string;
    is_admin?: boolean;
    limit?: number;
    offset?: number;
    sort_by?: 'created' | 'last_seen' | 'username';
    order?: 'asc' | 'desc';
}
export interface UserActivityDTO {
    user_id: number;
    last_seen: string;
    books_saved: number;
    reviews_written: number;
    books_downloaded: number;
    status: 'active' | 'inactive' | 'suspended';
}
export interface AdminUserDTO extends UserResponseDTO {
    total_users_managed?: number;
    moderation_actions?: number;
    last_action?: string;
}
export interface UserNotificationSettingsDTO {
    user_id: number;
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'never';
    time: string;
    genres: string[];
}
//# sourceMappingURL=UserDTO.d.ts.map