import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {EditCostContributionDialogComponent} from './edit-cost-contribution-dialog.component';

describe('EditCostContributionDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<EditCostContributionDialogComponent>>;

  beforeEach(() => {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    TestBed.configureTestingModule({
      providers: [
        {
          provide: MatDialogRef,
          useValue: dialogRef
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            pendingAmount: 8
          }
        }
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(EditCostContributionDialogComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('dialog opens pre-filled with the pending amount', () => {
    const fixture = TestBed.createComponent(EditCostContributionDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.data).toEqual({pendingAmount: 8});
    expect(fixture.componentInstance.amountInput()).toBe(8);
  });

  it('closing dialog with a new amount records it', () => {
    const fixture = TestBed.createComponent(EditCostContributionDialogComponent);
    fixture.componentInstance.amountInput.set(50);
    fixture.componentInstance.dialogRef.close(fixture.componentInstance.amountInput());
    fixture.detectChanges();

    expect(dialogRef.close).toHaveBeenCalledWith(50);
  });

  it('closing dialog with zero is allowed', () => {
    const fixture = TestBed.createComponent(EditCostContributionDialogComponent);
    fixture.componentInstance.amountInput.set(0);
    fixture.componentInstance.dialogRef.close(fixture.componentInstance.amountInput());
    fixture.detectChanges();

    expect(dialogRef.close).toHaveBeenCalledWith(0);
  });

  it('closing dialog without an amount cancels', () => {
    const fixture = TestBed.createComponent(EditCostContributionDialogComponent);
    fixture.componentInstance.dialogRef.close();
    fixture.detectChanges();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
