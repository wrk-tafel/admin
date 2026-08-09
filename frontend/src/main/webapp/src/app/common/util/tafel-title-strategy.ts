import {inject, Injectable, signal} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {RouterStateSnapshot, TitleStrategy} from '@angular/router';

const APPLICATION_NAME = 'Tafel Admin';

/**
 * Puts the active route's `title` in front of the application name, so that every screen has a
 * document title of its own instead of all of them sharing the one from `index.html`.
 *
 * That title is what a screen reader announces after an in-app navigation - a single-page
 * application performs no document load the user agent could announce on its own - and what the
 * browser's tab, history and bookmarks show. Routes without a `title` keep the bare application
 * name rather than a dangling separator.
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
