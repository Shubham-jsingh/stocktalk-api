export interface FeedPage<T> {
  items: T[];
  limit: number;
  nextCursor: string | null;
  fallback?: boolean;
}
