import {inject, Injectable} from '@angular/core';
import {LiveAnnouncer} from '@angular/cdk/a11y';

/**
 * The two things a keyboard reorder needs that the visual reordering alone does not provide:
 * saying what happened, and leaving focus where the user expects it.
 */
@Injectable({providedIn: 'root'})
export class ReorderFeedbackService {
  private readonly liveAnnouncer = inject(LiveAnnouncer);

  /** `index` is the record's new place in the list, counted from 0. */
  announce(label: string, index: number, count: number) {
    this.liveAnnouncer.announce(`${label} ist jetzt an Position ${index + 1} von ${count}.`, 'assertive');
  }

  /**
   * Puts focus back on the moved record's handle once the list has re-rendered - the element that
   * had focus is gone by then, which would otherwise drop the user back to the top of the page
   * after a single move.
   *
   * The responsive screens render the same testid twice, once per layout, and only one of them is
   * ever displayed; focusing the hidden one would silently do nothing, hence the `offsetParent`
   * check rather than a plain `querySelector`.
   */
  refocusHandle(testId: string) {
    setTimeout(() => {
      const handles = Array.from(document.querySelectorAll<HTMLElement>(`[testid="${testId}"]`));
      handles.find(handle => handle.offsetParent !== null)?.focus();
    });
  }
}
