export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 10;
