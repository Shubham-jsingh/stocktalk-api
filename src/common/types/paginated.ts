export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  // Present only when a following feed had no matches and latest posts were returned.
  fallback?: boolean;
}
