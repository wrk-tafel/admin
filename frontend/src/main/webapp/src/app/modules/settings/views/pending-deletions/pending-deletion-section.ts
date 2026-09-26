import {computed, linkedSignal, Signal, signal} from '@angular/core';
import {rxResource} from '@angular/core/rxjs-interop';
import {PageEvent} from '@angular/material/paginator';
import {Observable} from 'rxjs';
import {DEFAULT_PAGE_SIZE} from '../../../../common/api/paged-response';
import {PendingDeletionListResponse} from '../../../../api/pending-deletions-api.service';

/**
 * The state of one list on the pending-deletions screen: its own page, page size, request and
 * failure, so paging - or breaking - one list never touches another.
 */
export interface PendingDeletionSection<T> {
  /** The page shown. Kept while the next one loads, so the list does not vanish on every page change. */
  readonly data: Signal<PendingDeletionListResponse<T> | null>;
  /** Only the very first load: with a page already on screen, the next one replaces it in place. */
  readonly initialLoading: Signal<boolean>;
  readonly failed: Signal<boolean>;
  readonly onPage: (event: PageEvent) => void;
  readonly reload: () => void;
}

/**
 * Must be called in an injection context (a field initializer). Nothing is requested while
 * `visible` is false - a list the caller may not see answers 403.
 */
export function pendingDeletionSection<T>(
  visible: () => boolean,
  fetch: (page: number, pageSize: number) => Observable<PendingDeletionListResponse<T>>
): PendingDeletionSection<T> {
  const page = signal(1);
  const pageSize = signal(DEFAULT_PAGE_SIZE);

  const resource = rxResource({
    params: () => visible() ? {page: page(), pageSize: pageSize()} : undefined,
    stream: ({params}) => fetch(params.page, params.pageSize)
  });

  const data = linkedSignal<PendingDeletionListResponse<T> | undefined, PendingDeletionListResponse<T> | null>({
    source: () => resource.hasValue() ? resource.value() : undefined,
    computation: (value, previous) => value ?? previous?.value ?? null
  });

  return {
    data,
    initialLoading: computed(() => resource.isLoading() && data() === null),
    failed: computed(() => resource.status() === 'error'),
    onPage: (event: PageEvent) => {
      // A new page size starts over at page 1: the old page number means something else at another size.
      if (event.pageSize !== pageSize()) {
        pageSize.set(event.pageSize);
        page.set(1);
      } else {
        page.set(event.pageIndex + 1);
      }
    },
    reload: () => resource.reload()
  };
}
