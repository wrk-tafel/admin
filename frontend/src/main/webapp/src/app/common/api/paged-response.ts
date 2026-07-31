export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}
