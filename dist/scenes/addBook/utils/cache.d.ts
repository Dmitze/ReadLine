export interface Tag {
    id: number;
    name: string;
    created_at?: string;
}
export declare function getCachedTags(): Promise<Tag[]>;
export declare function clearTagsCache(): void;
//# sourceMappingURL=cache.d.ts.map