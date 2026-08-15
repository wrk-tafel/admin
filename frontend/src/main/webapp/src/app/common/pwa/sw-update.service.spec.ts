import {beforeEach, describe, expect, it, vi} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {Subject} from 'rxjs';
import {SwUpdate, VersionEvent} from '@angular/service-worker';
import {MatSnackBarRef} from '@angular/material/snack-bar';
import {SwUpdateService} from './sw-update.service';
import {TafelToastrService} from '../components/tafel-toastr/tafel-toastr.service';
import {TafelSnackbarComponent} from '../components/tafel-snackbar/tafel-snackbar.component';

describe('SwUpdateService', () => {
  let service: SwUpdateService;
  let versionUpdates: Subject<VersionEvent>;
  let mockSwUpdate: { isEnabled: boolean; versionUpdates: Subject<VersionEvent> };
  let mockToastr: { warning: ReturnType<typeof vi.fn> };
  let mockSnackBarRef: { onAction: ReturnType<typeof vi.fn> };
  let onActionSubject: Subject<void>;
  let mockWindow: { location: { reload: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    versionUpdates = new Subject<VersionEvent>();
    onActionSubject = new Subject<void>();
    mockSwUpdate = {isEnabled: true, versionUpdates};
    mockSnackBarRef = {onAction: vi.fn().mockReturnValue(onActionSubject)};
    mockToastr = {warning: vi.fn().mockReturnValue(mockSnackBarRef as unknown as MatSnackBarRef<TafelSnackbarComponent>)};

    mockWindow = {location: {reload: vi.fn()}};

    TestBed.configureTestingModule({
      providers: [
        {provide: SwUpdate, useValue: mockSwUpdate},
        {provide: TafelToastrService, useValue: mockToastr},
        {provide: Window, useValue: mockWindow}
      ]
    });
    service = TestBed.runInInjectionContext(() => new SwUpdateService());
  });

  it('does nothing when the service worker is not enabled', () => {
    mockSwUpdate.isEnabled = false;

    service.init();
    versionUpdates.next({type: 'VERSION_READY'} as VersionEvent);

    expect(mockToastr.warning).not.toHaveBeenCalled();
  });

  it('shows a reload prompt once a new version is ready', () => {
    service.init();

    versionUpdates.next({type: 'VERSION_READY'} as VersionEvent);

    expect(mockToastr.warning).toHaveBeenCalledWith(
      'Eine neue Version ist verfügbar.',
      undefined,
      {action: 'Neu laden', durationMs: 0}
    );
  });

  it('ignores version events other than VERSION_READY', () => {
    service.init();

    versionUpdates.next({type: 'VERSION_DETECTED'} as VersionEvent);

    expect(mockToastr.warning).not.toHaveBeenCalled();
  });

  it('reloads the page when the reload action is triggered', () => {
    service.init();
    versionUpdates.next({type: 'VERSION_READY'} as VersionEvent);
    onActionSubject.next();

    expect(mockWindow.location.reload).toHaveBeenCalled();
  });

});
