export * from './tables';

export { getBooksByIds } from './tables/books';

import { db as database } from './tables/db';
export { database as db };
