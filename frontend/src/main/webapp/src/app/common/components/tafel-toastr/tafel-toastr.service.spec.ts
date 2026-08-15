import {beforeEach, describe, expect, it, vi} from 'vitest';
import {TafelToastrService} from './tafel-toastr.service';
import {TestBed} from '@angular/core/testing';
import {MatSnackBar} from '@angular/material/snack-bar';
import {TafelSnackbarComponent} from '../tafel-snackbar/tafel-snackbar.component';

describe('TafelToastrService', () => {
  let service: TafelToastrService;
  let mockSnackBar: {openFromComponent: ReturnType<typeof vi.fn>};

  beforeEach(() => {
    mockSnackBar = {openFromComponent: vi.fn()};

    TestBed.configureTestingModule({
      providers: [
        {provide: MatSnackBar, useValue: mockSnackBar}
      ]
    });
    service = TestBed.runInInjectionContext(() => new TafelToastrService());
  });

  it('should open a snack bar with the success severity and default duration', () => {
    service.success('Msg', 'Title');

    expect(mockSnackBar.openFromComponent).toHaveBeenCalledWith(TafelSnackbarComponent, expect.objectContaining({
      data: {message: 'Msg', title: 'Title', severity: 'success', action: undefined},
      duration: 5000,
      panelClass: ['tafel-snackbar-panel', 'tafel-snackbar-panel-success'],
    }));
  });

  it('should open a snack bar with the error severity', () => {
    service.error('Failed');

    expect(mockSnackBar.openFromComponent).toHaveBeenCalledWith(TafelSnackbarComponent, expect.objectContaining({
      data: {message: 'Failed', title: undefined, severity: 'error', action: undefined},
      panelClass: ['tafel-snackbar-panel', 'tafel-snackbar-panel-error'],
    }));
  });

  it('should open a snack bar with the warning severity', () => {
    service.warning('Watch out');

    expect(mockSnackBar.openFromComponent).toHaveBeenCalledWith(TafelSnackbarComponent, expect.objectContaining({
      data: {message: 'Watch out', title: undefined, severity: 'warning', action: undefined},
      panelClass: ['tafel-snackbar-panel', 'tafel-snackbar-panel-warning'],
    }));
  });

  it('should pass an action and a custom duration through to the snack bar', () => {
    const snackBarRef = {};
    mockSnackBar.openFromComponent.mockReturnValue(snackBarRef);

    const result = service.success('Msg', undefined, {action: 'Rückgängig', durationMs: 8000});

    expect(mockSnackBar.openFromComponent).toHaveBeenCalledWith(TafelSnackbarComponent, expect.objectContaining({
      data: {message: 'Msg', title: undefined, severity: 'success', action: 'Rückgängig'},
      duration: 8000,
    }));
    expect(result).toBe(snackBarRef);
  });

  it('should keep the toast open when durationMs is 0', () => {
    service.warning('Msg', undefined, {action: 'Neu laden', durationMs: 0});

    expect(mockSnackBar.openFromComponent).toHaveBeenCalledWith(TafelSnackbarComponent, expect.objectContaining({
      duration: 0,
    }));
  });

});
