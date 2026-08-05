import {inject, Service} from '@angular/core';
import {DOCUMENT} from '@angular/common';

@Service()
export class UrlHelperService {
  private readonly document = inject(DOCUMENT);

  /**
   * Derived from `document.baseURI` (the `<base href>` in index.html) rather than the current
   * pathname - the app uses hash-based routing, so a direct navigation to a non-root path (e.g.
   * a bookmark to `/login`) briefly puts that path segment into `location.pathname` before the
   * router normalizes it into the hash. Reading the pathname here raced that normalization and
   * misidentified the route segment as a deployment subpath (see #2972).
   */
  getBaseUrl(): string {
    let baseUri = this.document.baseURI;
    if (baseUri.endsWith('/')) {
      baseUri = baseUri.slice(0, -1);
    }

    return baseUri;
  }

}
