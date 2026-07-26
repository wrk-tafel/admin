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
      data: {message: 'Msg', title: 'Title', severity: 'success'},
      duration: 5000,
      panelClass: ['tafel-snackbar-panel', 'tafel-snackbar-panel-success'],
    }));
  });

  it('should open a snack bar with the error severity', () => {
    service.error('Failed');

    expect(mockSnackBar.openFromComponent).toHaveBeenCalledWith(TafelSnackbarComponent, expect.objectContaining({
      data: {message: 'Failed', title: undefined, severity: 'error'},
      panelClass: ['tafel-snackbar-panel', 'tafel-snackbar-panel-error'],
    }));
  });

});
