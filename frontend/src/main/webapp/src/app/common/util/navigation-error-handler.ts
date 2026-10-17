import {HttpErrorResponse} from '@angular/common/http';
import {inject} from '@angular/core';
import {NavigationError, RedirectCommand, Router} from '@angular/router';
import {TafelToastrService} from '../components/tafel-toastr/tafel-toastr.service';

const TOAST_TITLE = 'Seite konnte nicht geöffnet werden';
const NOT_FOUND_MESSAGE = 'Dieser Eintrag existiert nicht (mehr).';
const REQUEST_FAILED_MESSAGE = 'Die Daten für diese Seite konnten nicht geladen werden. Bitte nochmal versuchen.';
const RELOAD_MESSAGE = 'Die Seite konnte nicht geladen werden. Bitte die Anwendung neu laden.';

/** Chrome, Firefox and Safari word a failed `import()` differently. */
const CHUNK_LOAD_ERROR = /dynamically imported module|Importing a module script failed/;
const CHUNK_RELOAD_KEY = 'tafel-chunk-reload';
/** Long enough to tell "the reload did not help" apart from a later, unrelated deploy. */
const CHUNK_RELOAD_WINDOW_MS = 60_000;

/**
 * What the application does when a navigation fails - a resolver's request erroring out, a guard
 * throwing, or the lazily loaded code of the target route not arriving.
 *
 * Every one of those used to end on the 404 page, which says the wrong thing about almost all of
 * them: a backend that is momentarily unreachable (a redeploy, a dropped connection, a request that
 * timed out) does not mean the page does not exist, and telling the user it does not - while taking
 * away the perfectly working screen they were on - is what issue #3139 saw as "the sidebar sends me
 * to 404 for a few seconds, then it works again".
 *
 * So the failure is classified instead, along two questions:
 *
 * 1. **Is there still a page to stay on?** For an in-app navigation there is: the screen the user
 *    came from was never torn down, because activation never got that far, and the router restores
 *    the URL by itself when the error handler returns nothing. Staying there and reporting what
 *    happened keeps the user's context and lets them simply try again. Only a navigation with no
 *    predecessor at all - a direct link, a bookmark, a reload - has nothing to fall back to, and
 *    that (not the in-app case) is what the error pages exist for.
 * 2. **Was it "not found" or was it "not right now"?** A resolver answering `404` is the one case
 *    where the URL really does address something that isn't there. Anything else - a `500`, a
 *    connection that never opened, a chunk that failed to download - is a technical failure and is
 *    reported as one.
 *
 * A route whose code could not be fetched is called out separately: the browser remembers a failed
 * dynamic import for the lifetime of the document, so clicking the same entry again cannot succeed
 * no matter how healthy the backend is by then - only reloading the application can fix that one.
 * So the handler does that reload itself, once, straight to the target page: the usual cause is a
 * tab left open across a deploy, still running the previous build and asking for chunk files that
 * no longer exist, and a fresh load of the page is all it needs (#3872). Only when that same
 * navigation fails again right after its reload does the user get the toast.
 */
export function handleNavigationError(event: NavigationError): RedirectCommand | void {
  const router = inject(Router);
  const toastr = inject(TafelToastrService);
  const windowRef = inject(Window);

  // Nothing else records this: the router reports the error through this handler instead of
  // rethrowing it, so without this line a failed navigation leaves no trace to diagnose from.
  console.error('Navigation to', event.url, 'failed', event.error);

  if (reloadForMissingCode(event, windowRef)) {
    return;
  }

  const notFound = event.error instanceof HttpErrorResponse && event.error.status === 404;

  if (router.lastSuccessfulNavigation() === null) {
    return new RedirectCommand(router.parseUrl(notFound ? '/404' : '/500'));
  }

  toastr.error(messageFor(event.error, notFound), TOAST_TITLE);
}

function messageFor(error: unknown, notFound: boolean): string {
  if (notFound) {
    return NOT_FOUND_MESSAGE;
  }
  // An HttpErrorResponse means the route's own code is already here and one of its requests failed -
  // that one is worth retrying. Anything else got as far as loading the route and no further.
  return error instanceof HttpErrorResponse ? REQUEST_FAILED_MESSAGE : RELOAD_MESSAGE;
}

function reloadForMissingCode(event: NavigationError, windowRef: Window): boolean {
  if (!(event.error instanceof Error && CHUNK_LOAD_ERROR.test(event.error.message))) {
    return false;
  }

  const now = Date.now();
  try {
    const previous = JSON.parse(windowRef.sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 'null') as ChunkReload | null;
    if (previous?.url === event.url && now - previous.at < CHUNK_RELOAD_WINDOW_MS) {
      return false;
    }
    windowRef.sessionStorage.setItem(CHUNK_RELOAD_KEY, JSON.stringify({url: event.url, at: now}));
  } catch {
    // Without the marker nothing would stop a page whose code is really gone from reloading forever.
    return false;
  }

  // The router's URL is relative to the base href the application is served under.
  windowRef.location.assign(new URL(event.url.replace(/^\//, ''), windowRef.document.baseURI).href);
  return true;
}

interface ChunkReload {
  url: string;
  at: number;
}
