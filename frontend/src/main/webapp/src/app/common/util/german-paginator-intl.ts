import {MatPaginatorIntl} from '@angular/material/paginator';

/**
 * German-language `MatPaginatorIntl` for `mat-paginator`, registered app-wide as its provider.
 * `getRangeLabel` mirrors Angular Material's own default implementation (just German-translated),
 * including its edge-case handling: a `0`/`0` result when there's nothing to page through, and an
 * `endIndex` past `normalizedLength` on the last page when `page * pageSize` already exceeds the
 * total (avoids showing a shrinking, out-of-range end index while items are still loading).
 */
export function getGermanPaginatorIntl(): MatPaginatorIntl {
  const paginatorIntl = new MatPaginatorIntl();

  paginatorIntl.itemsPerPageLabel = 'Elemente pro Seite:';
  paginatorIntl.nextPageLabel = 'Nächste Seite';
  paginatorIntl.previousPageLabel = 'Vorherige Seite';
  paginatorIntl.firstPageLabel = 'Erste Seite';
  paginatorIntl.lastPageLabel = 'Letzte Seite';

  paginatorIntl.getRangeLabel = (page: number, pageSize: number, length: number) => {
    if (length === 0 || pageSize === 0) {
      return `0 von ${length}`;
    }
    const normalizedLength = Math.max(length, 0);
    const startIndex = page * pageSize;
    const endIndex = startIndex < normalizedLength
      ? Math.min(startIndex + pageSize, normalizedLength)
      : startIndex + pageSize;
    return `${startIndex + 1} - ${endIndex} von ${normalizedLength}`;
  };

  return paginatorIntl;
}
