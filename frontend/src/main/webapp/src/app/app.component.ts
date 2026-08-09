import {Component, effect, inject, signal} from '@angular/core';
import {NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet} from '@angular/router';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AuthenticationService} from './common/security/authentication.service';
import {PushNotificationService} from './common/pwa/push-notification.service';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'body',
  templateUrl: 'app.component.html',
  imports: [
    RouterOutlet,
    MatProgressBarModule
  ]
})

export class AppComponent {
  private readonly router = inject(Router);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly pushNotificationService = inject(PushNotificationService);

  // Route resolvers (e.g. list-page data fetches) block navigation before the target component
  // even mounts, so a component-level spinner can't cover that window - this shows a top-level
  // bar for the whole navigation instead, from NavigationStart until it settles either way.
  //
  // Subscribes directly to router.events rather than going through toSignal()/effect(): a single
  // navigation fires many events synchronously in quick succession (NavigationStart,
  // RouteConfigLoadStart, ResolveStart, ...), and toSignal() only guarantees the latest value to
  // its consumers - effect() can and does miss an intermediate event (verified: NavigationStart
  // was silently dropped this way when a slow resolver was involved), where a plain subscription
  // processes every emission.
  readonly navigating = signal(false);

  // Most navigations settle well under this, so showing the bar immediately would just flicker -
  // only surface it once a navigation has actually been in flight long enough to be noticeable.
  private static readonly SHOW_DELAY_MS = 500;

  // Tracks which navigation the bar is currently shown for, so an End/Cancel/Error belonging to
  // an unrelated, already-superseded navigation can't clear the bar while the navigation the user
  // actually triggered is still in flight.
  private currentNavigationId: number | null = null;

  private showDelayTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // A client-side navigation swaps the whole screen without the user agent noticing any of it: no
  // document load happens, so nothing is announced (the document title alone is not - see
  // `TafelTitleStrategy`), and focus stays on the sidebar link that was activated, from where the
  // next Tab continues through the navigation instead of entering the page that just opened.
  // Moving focus to the `main` landmark fixes both at once: it is where the shell renders the
  // route title as the page's `h1`, so the screen announces itself, and the keyboard continues
  // from the start of the new content.
  private static readonly MAIN_CONTENT_ID = 'hauptinhalt';

  // The first NavigationEnd belongs to the document load, which announces itself.
  private firstNavigationHandled = false;

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(evt => {
      if (evt instanceof NavigationStart) {
        this.currentNavigationId = evt.id;
        this.showDelayTimeoutId = setTimeout(() => {
          if (evt.id === this.currentNavigationId) {
            this.navigating.set(true);
          }
        }, AppComponent.SHOW_DELAY_MS);
      } else if (evt instanceof NavigationEnd || evt instanceof NavigationCancel || evt instanceof NavigationError) {
        if (evt.id === this.currentNavigationId) {
          if (this.showDelayTimeoutId !== null) {
            clearTimeout(this.showDelayTimeoutId);
            this.showDelayTimeoutId = null;
          }
          this.navigating.set(false);
        }
      }

      if (evt instanceof NavigationEnd) {
        window.scrollTo(0, 0);
        this.focusMainContent();
      }
    });

    // Re-registers this device with the backend once a session exists, if the backend has lost
    // track of a browser subscription that's still live - see
    // `PushNotificationService.syncSubscription`. Keyed on userInfo rather than run once at
    // bootstrap so it covers both a fresh login and a reload into an existing session, and re-runs
    // when a different user logs in on the same device (which re-attributes the subscription).
    // Costs nothing for devices without a subscription: the sync returns before any request.
    effect(() => {
      if (this.authenticationService.userInfo()) {
        this.pushNotificationService.syncSubscription();
      }
    });
  }

  private focusMainContent() {
    const wasFirst = !this.firstNavigationHandled;
    this.firstNavigationHandled = true;
    if (wasFirst) {
      return;
    }

    // Screens without the shell (login, the ticket-screen kiosk) have no main landmark at all.
    const main = document.getElementById(AppComponent.MAIN_CONTENT_ID);
    if (!main) {
      return;
    }

    // A screen that autofocuses a control of its own (`tafelAutofocus`, e.g. the check-in customer
    // number the scanner types into) has already put focus where it belongs - taking it back to
    // the landmark would break exactly the flow that autofocus exists for.
    const active = document.activeElement;
    if (active && active !== document.body && main.contains(active)) {
      return;
    }

    main.focus();
  }

}
