import { getAllTags } from '../../../database/tagFunctions';
import { logger } from '../../../utils/logger';

export interface Tag {
  id: number;
  name: string;
  created_at?: string;
}

let cachedTags: Tag[] = [];
let tagsLastUpdated = 0;
const TAGS_CACHE_DURATION = 5 * 60 * 1000;

export async function getCachedTags(): Promise<Tag[]> {
  const now = Date.now();
  if (cachedTags.length === 0 || now - tagsLastUpdated > TAGS_CACHE_DURATION) {
    cachedTags = await getAllTags();
    tagsLastUpdated = now;
    logger.debug('Tags cache updated', { count: cachedTags.length });
  }
  return cachedTags;
}

export function clearTagsCache(): void {
  cachedTags = [];
  tagsLastUpdated = 0;
}
