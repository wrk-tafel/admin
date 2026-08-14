import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MatDialog} from '@angular/material/dialog';
import {of} from 'rxjs';
import {firstValueFrom, isObservable} from 'rxjs';
import {customerEditUnsavedChangesGuard, HasUnsavedChanges} from './customer-edit-unsaved-changes.guard';

describe('customerEditUnsavedChangesGuard', () => {
  let dialog: MockedObject<MatDialog>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MatDialog,
          useValue: {
            open: vi.fn().mockName('MatDialog.open')
          }
        }
      ]
    });
    dialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
  });

  function runGuard(component: HasUnsavedChanges) {
    return TestBed.runInInjectionContext(
      () => customerEditUnsavedChangesGuard(component as any, null as any, null as any, null as any)
    );
  }

  it('allows leaving without asking when there are no unsaved changes', () => {
    const component: HasUnsavedChanges = {hasUnsavedChanges: () => false};

    const result = runGuard(component);

    expect(result).toBe(true);
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('asks for confirmation and allows leaving when confirmed', async () => {
    dialog.open.mockReturnValue({afterClosed: () => of(true)} as any);
    const component: HasUnsavedChanges = {hasUnsavedChanges: () => true};

    const result = runGuard(component);

    expect(isObservable(result)).toBe(true);
    expect(await firstValueFrom(result as any)).toBe(true);
    expect(dialog.open).toHaveBeenCalled();
  });

  it('keeps the operator on the page when the confirmation is cancelled', async () => {
    dialog.open.mockReturnValue({afterClosed: () => of(undefined)} as any);
    const component: HasUnsavedChanges = {hasUnsavedChanges: () => true};

    const result = runGuard(component);

    expect(await firstValueFrom(result as any)).toBe(false);
  });
});
