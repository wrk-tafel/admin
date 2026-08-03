import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {PayCostContributionDialogComponent} from './pay-cost-contribution-dialog.component';

describe('PayCostContributionDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<PayCostContributionDialogComponent>>;

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
    const fixture = TestBed.createComponent(PayCostContributionDialogComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('dialog opens with the pending amount', () => {
    const fixture = TestBed.createComponent(PayCostContributionDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.data).toEqual({pendingAmount: 8});
  });

  it('closing dialog with an amount records the payment', () => {
    const fixture = TestBed.createComponent(PayCostContributionDialogComponent);
    fixture.componentInstance.amountInput.set(4);
    fixture.componentInstance.dialogRef.close(fixture.componentInstance.amountInput());
    fixture.detectChanges();

    expect(dialogRef.close).toHaveBeenCalledWith(4);
  });

  it('closing dialog without an amount cancels', () => {
    const fixture = TestBed.createComponent(PayCostContributionDialogComponent);
    fixture.componentInstance.dialogRef.close();
    fixture.detectChanges();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
