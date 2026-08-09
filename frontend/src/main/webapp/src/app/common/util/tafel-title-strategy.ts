import {inject, Injectable, signal} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {RouterStateSnapshot, TitleStrategy} from '@angular/router';

const APPLICATION_NAME = 'Tafel Admin';

/**
 * Puts the active route's `title` in front of the application name, so that every screen has a
 * document title of its own instead of all of them sharing the one from `index.html`.
 *
 * The title is what the browser's tab, history and bookmarks show. It is **not** what announces
 * the screen change: a `document.title` written during a client-side navigation is not announced
 * by NVDA, JAWS or VoiceOver, because no document load happened for the user agent to report.
 * Moving focus is what does that here - `AppComponent` focuses the shell's `main` on
 * `NavigationEnd`, where the same title is rendered as the page's `h1`.
 *
 * Routes without a `title` keep the bare application name rather than a dangling separator.
 */
@Injectable({providedIn: 'root'})
export class TafelTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  private readonly _routeTitle = signal('');

  /**
   * The active route's own title, without the application name the document title appends. The
   * shell renders it as the page's `h1`, so that every screen has exactly one - the screens
   * themselves carry no page heading, only the headings of the cards they are built from.
   */
  readonly routeTitle = this._routeTitle.asReadonly();

  override updateTitle(snapshot: RouterStateSnapshot) {
    const routeTitle = this.buildTitle(snapshot);
    this._routeTitle.set(routeTitle ?? '');
    this.title.setTitle(routeTitle ? `${routeTitle} - ${APPLICATION_NAME}` : APPLICATION_NAME);
  }
}
