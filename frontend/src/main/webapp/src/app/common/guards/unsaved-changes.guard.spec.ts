import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MatDialog} from '@angular/material/dialog';
import {firstValueFrom, of} from 'rxjs';
import {HasUnsavedChanges, unsavedChangesGuard} from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  let dialog: MockedObject<MatDialog>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MatDialog,
          useValue: {open: vi.fn().mockName('MatDialog.open')}
        }
      ]
    });

    dialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
  });

  function runGuard(component: HasUnsavedChanges) {
    return TestBed.runInInjectionContext(() =>
      // The guard signature carries the router's full set of navigation arguments; only the
      // component is used here, the rest can stay undefined for the test.
      unsavedChangesGuard(component, undefined as any, undefined as any, undefined as any)
    );
  }

  it('allows navigating away without asking when there are no unsaved changes', () => {
    const component: HasUnsavedChanges = {hasUnsavedChanges: () => false};

    const result = runGuard(component);

    expect(result).toBe(true);
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('opens the confirmation dialog and allows leaving when confirmed', async () => {
    const component: HasUnsavedChanges = {hasUnsavedChanges: () => true};
    dialog.open.mockReturnValue({afterClosed: () => of(true)} as any);

    const result = await firstValueFrom(runGuard(component) as any);

    expect(dialog.open).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('keeps the navigation blocked when the dialog is dismissed without confirming', async () => {
    const component: HasUnsavedChanges = {hasUnsavedChanges: () => true};
    dialog.open.mockReturnValue({afterClosed: () => of(undefined)} as any);

    const result = await firstValueFrom(runGuard(component) as any);

    expect(result).toBe(false);
  });
});
