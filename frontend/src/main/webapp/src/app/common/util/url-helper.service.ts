import {inject, Service} from '@angular/core';
import {DOCUMENT} from '@angular/common';

@Service()
export class UrlHelperService {
  private readonly document = inject(DOCUMENT);

  /**
   * Derived from `document.baseURI` (the `<base href>` in index.html) rather than the current
   * pathname - `location.pathname` mixes the deployment prefix with whatever client-side route is
   * currently active (e.g. `/tafel-admin/kunden/suchen`), so there's no reliable way to tell where
   * the prefix ends and the route begins. `<base href>` is templated server-side to exactly the
   * deployment prefix regardless of the current route, which is what broke here originally when a
   * bookmark to a non-root path was read from the pathname instead (see #2972).
   */
  getBaseUrl(): string {
    let baseUri = this.document.baseURI;
    if (baseUri.endsWith('/')) {
      baseUri = baseUri.slice(0, -1);
    }

    return baseUri;
  }

}
