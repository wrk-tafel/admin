import {TestBed} from '@angular/core/testing';
import {MatDialog} from '@angular/material/dialog';
import {ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {of} from 'rxjs';
import {HasUnsavedChanges, unsavedChangesGuard} from './unsaved-changes.guard';
import {UnsavedChangesDialogComponent} from '../components/unsaved-changes-dialog/unsaved-changes-dialog.component';

describe('unsavedChangesGuard', () => {
  let dialogMock: Partial<MatDialog>;
  let dialogResult: boolean;

  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  const runGuard = (component: HasUnsavedChanges) =>
    TestBed.runInInjectionContext(() => unsavedChangesGuard(component, route, state, state));

  beforeEach(() => {
    dialogResult = true;

    dialogMock = {
      open: vi.fn(() => ({afterClosed: () => of(dialogResult)}) as never)
    };

    TestBed.configureTestingModule({
      providers: [
        {provide: MatDialog, useValue: dialogMock}
      ]
    });
  });

  it('leaves without asking when there is nothing unsaved', () => {
    expect(runGuard({hasUnsavedChanges: () => false})).toBe(true);
    expect(dialogMock.open).not.toHaveBeenCalled();
  });

  it('asks before discarding unsaved changes and leaves when they may be discarded', () => {
    let result: boolean | undefined;

    (runGuard({hasUnsavedChanges: () => true}) as any).subscribe((value: boolean) => result = value);

    expect(dialogMock.open).toHaveBeenCalledWith(UnsavedChangesDialogComponent, {width: '500px'});
    expect(result).toBe(true);
  });

  it('stays on the page when the confirmation is declined', () => {
    dialogResult = false;
    let result: boolean | undefined;

    (runGuard({hasUnsavedChanges: () => true}) as any).subscribe((value: boolean) => result = value);

    expect(result).toBe(false);
  });
});
