import {HttpErrorResponse} from '@angular/common/http';
import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {DefaultUrlSerializer, NavigationError, Navigation, RedirectCommand, Router} from '@angular/router';
import {handleNavigationError} from './navigation-error-handler';
import {TafelToastrService} from '../components/tafel-toastr/tafel-toastr.service';

describe('handleNavigationError', () => {
  const urlSerializer = new DefaultUrlSerializer();

  function setup(previousPage: 'none' | 'exists') {
    const routerSpy = {
      lastSuccessfulNavigation: signal(previousPage === 'exists' ? <Navigation>{} : null),
      parseUrl: (url: string) => urlSerializer.parse(url)
    };
    const toastrSpy = {
      error: vi.fn().mockName('TafelToastrService.error')
    };

    const storage = new Map<string, string>();
    const windowSpy = {
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value)
      },
      location: {assign: vi.fn().mockName('Location.assign')},
      document: {baseURI: 'https://tafel.example/verwaltung/'}
    };

    TestBed.configureTestingModule({
      providers: [
        {provide: Router, useValue: routerSpy},
        {provide: TafelToastrService, useValue: toastrSpy},
        {provide: Window, useValue: windowSpy}
      ]
    });

    // The handler logs every failure for diagnosis - keep that out of the test output.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    return {toastrSpy, windowSpy};
  }

  function handle(error: unknown) {
    return TestBed.runInInjectionContext(
      () => handleNavigationError(new NavigationError(1, '/kunden/suchen', error))
    );
  }

  function redirectTargetOf(result: RedirectCommand | void): string {
    expect(result).toBeInstanceOf(RedirectCommand);
    return urlSerializer.serialize((result as RedirectCommand).redirectTo);
  }

  it('keeps the user on the page they came from when a resolver request failed', () => {
    const {toastrSpy} = setup('exists');

    const result = handle(new HttpErrorResponse({status: 500, statusText: 'Internal Server Error'}));

    expect(result).toBeUndefined();
    expect(toastrSpy.error).toHaveBeenCalledWith(
      'Die Daten für diese Seite konnten nicht geladen werden. Bitte nochmal versuchen.',
      'Seite konnte nicht geöffnet werden'
    );
  });

  it('reports a resolver 404 as a record that no longer exists, without leaving the current page', () => {
    const {toastrSpy} = setup('exists');

    const result = handle(new HttpErrorResponse({status: 404, statusText: 'Not Found'}));

    expect(result).toBeUndefined();
    expect(toastrSpy.error).toHaveBeenCalledWith(
      'Dieser Eintrag existiert nicht (mehr).',
      'Seite konnte nicht geöffnet werden'
    );
  });

  // A tab still running the build from before a deploy asks for chunk files that are gone (#3872).
  it('reloads the target page under the base href when the route\'s own code could not be fetched', () => {
    const {toastrSpy, windowSpy} = setup('exists');

    const result = handle(new TypeError('error loading dynamically imported module: https://tafel.example/verwaltung/chunk-ABC123.js'));

    expect(result).toBeUndefined();
    expect(windowSpy.location.assign).toHaveBeenCalledWith('https://tafel.example/verwaltung/kunden/suchen');
    expect(toastrSpy.error).not.toHaveBeenCalled();
  });

  it('reloads a page whose code could not be fetched even without a page to stay on', () => {
    const {windowSpy} = setup('none');

    const result = handle(new TypeError('Importing a module script failed.'));

    expect(result).toBeUndefined();
    expect(windowSpy.location.assign).toHaveBeenCalledTimes(1);
  });

  it('does not reload for a failed resolver request', () => {
    const {windowSpy} = setup('exists');

    handle(new HttpErrorResponse({status: 500, statusText: 'Internal Server Error'}));

    expect(windowSpy.location.assign).not.toHaveBeenCalled();
  });

  it('asks for a reload instead of reloading again when the code is still missing after the reload', () => {
    const {toastrSpy, windowSpy} = setup('exists');
    handle(new TypeError('Failed to fetch dynamically imported module: /chunk-ABC123.js'));

    const result = handle(new TypeError('Failed to fetch dynamically imported module: /chunk-ABC123.js'));

    expect(result).toBeUndefined();
    expect(windowSpy.location.assign).toHaveBeenCalledTimes(1);
    expect(toastrSpy.error).toHaveBeenCalledWith(
      'Die Seite konnte nicht geladen werden. Bitte die Anwendung neu laden.',
      'Seite konnte nicht geöffnet werden'
    );
  });

  // A direct link, a bookmark or a reload has no page of its own to stay on, so these two are the
  // only cases that still end on an error screen.
  it('shows the 404 page when a direct-linked page resolves to a record that is not there', () => {
    const {toastrSpy} = setup('none');

    const result = handle(new HttpErrorResponse({status: 404, statusText: 'Not Found'}));

    expect(redirectTargetOf(result)).toBe('/404');
    expect(toastrSpy.error).not.toHaveBeenCalled();
  });

  it('shows the 500 page when a direct-linked page fails for a technical reason', () => {
    const {toastrSpy} = setup('none');

    const result = handle(new HttpErrorResponse({status: 503, statusText: 'Service Unavailable'}));

    expect(redirectTargetOf(result)).toBe('/500');
    expect(toastrSpy.error).not.toHaveBeenCalled();
  });

});
