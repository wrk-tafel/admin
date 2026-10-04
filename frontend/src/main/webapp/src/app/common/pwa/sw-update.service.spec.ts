import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {Subject} from 'rxjs';
import {SwUpdate, VersionEvent} from '@angular/service-worker';
import {MatSnackBarRef} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {RELOAD_ON_NEW_VERSION, SwUpdateService, UPDATE_CHECK_INTERVAL_MS} from './sw-update.service';
import {TafelToastrService} from '../components/tafel-toastr/tafel-toastr.service';
import {TafelSnackbarComponent} from '../components/tafel-snackbar/tafel-snackbar.component';

describe('SwUpdateService', () => {
  let service: SwUpdateService;
  let versionUpdates: Subject<VersionEvent>;
  let mockSwUpdate: { isEnabled: boolean; versionUpdates: Subject<VersionEvent>; checkForUpdate: ReturnType<typeof vi.fn> };
  let leafRouteData: Record<string, unknown>;
  let mockToastr: { success: ReturnType<typeof vi.fn> };
  let mockSnackBarRef: { onAction: ReturnType<typeof vi.fn> };
  let onActionSubject: Subject<void>;
  let mockWindow: { location: { reload: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    versionUpdates = new Subject<VersionEvent>();
    onActionSubject = new Subject<void>();
    vi.useFakeTimers();
    mockSwUpdate = {isEnabled: true, versionUpdates, checkForUpdate: vi.fn().mockResolvedValue(false)};
    leafRouteData = {};
    // the root has no data of its own: what counts is the screen at the end of the chain
    const mockRouter = {routerState: {snapshot: {root: {data: {}, firstChild: {data: leafRouteData, firstChild: null}}}}};
    mockSnackBarRef = {onAction: vi.fn().mockReturnValue(onActionSubject)};
    mockToastr = {success: vi.fn().mockReturnValue(mockSnackBarRef as unknown as MatSnackBarRef<TafelSnackbarComponent>)};

    mockWindow = {location: {reload: vi.fn()}};

    TestBed.configureTestingModule({
      providers: [
        {provide: SwUpdate, useValue: mockSwUpdate},
        {provide: TafelToastrService, useValue: mockToastr},
        {provide: Window, useValue: mockWindow},
        {provide: Router, useValue: mockRouter}
      ]
    });
    service = TestBed.runInInjectionContext(() => new SwUpdateService());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when the service worker is not enabled', () => {
    mockSwUpdate.isEnabled = false;

    service.init();
    versionUpdates.next({type: 'VERSION_READY'} as VersionEvent);

    expect(mockToastr.success).not.toHaveBeenCalled();
  });

  it('shows a reload prompt once a new version is ready', () => {
    service.init();

    versionUpdates.next({type: 'VERSION_READY'} as VersionEvent);

    expect(mockToastr.success).toHaveBeenCalledWith(
      'Eine neue Version ist verfügbar.',
      undefined,
      {action: 'Neu laden', durationMs: 0}
    );
  });

  it('ignores version events other than VERSION_READY', () => {
    service.init();

    versionUpdates.next({type: 'VERSION_DETECTED'} as VersionEvent);

    expect(mockToastr.success).not.toHaveBeenCalled();
  });

  it('reloads the page when the reload action is triggered', () => {
    service.init();
    versionUpdates.next({type: 'VERSION_READY'} as VersionEvent);
    onActionSubject.next();

    expect(mockWindow.location.reload).toHaveBeenCalled();
  });

  it('reloads without asking on a screen that nobody operates', () => {
    leafRouteData[RELOAD_ON_NEW_VERSION] = true;
    service.init();

    versionUpdates.next({type: 'VERSION_READY'} as VersionEvent);

    expect(mockWindow.location.reload).toHaveBeenCalled();
    expect(mockToastr.success).not.toHaveBeenCalled();
  });

  it('does not reload on its own on a screen somebody works on', () => {
    service.init();

    versionUpdates.next({type: 'VERSION_READY'} as VersionEvent);

    expect(mockWindow.location.reload).not.toHaveBeenCalled();
  });

  it('asks for a new version regularly while the tab stays open', () => {
    service.init();
    expect(mockSwUpdate.checkForUpdate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
    expect(mockSwUpdate.checkForUpdate).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
    expect(mockSwUpdate.checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('keeps asking after a check that failed', async () => {
    mockSwUpdate.checkForUpdate.mockRejectedValueOnce(new Error('offline'));
    service.init();

    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS * 2);

    expect(mockSwUpdate.checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('does not ask for a new version when the service worker is not enabled', () => {
    mockSwUpdate.isEnabled = false;
    service.init();

    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);

    expect(mockSwUpdate.checkForUpdate).not.toHaveBeenCalled();
  });

});
