import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import dayjs from 'dayjs';
import {LockCustomerDialogComponent, LockCustomerDialogData} from './lock-customer-dialog.component';
import {HouseholdLockReason} from '../../../../../api/customer-api.service';

describe('LockCustomerDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<LockCustomerDialogComponent>>;

  function createComponent(data?: LockCustomerDialogData) {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    TestBed.configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        ...(data ? [{provide: MAT_DIALOG_DATA, useValue: data}] : [])
      ]
    });
    const fixture = TestBed.createComponent(LockCustomerDialogComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('a new lock preselects no category and needs both category and reason to be saved', () => {
    const component = createComponent();

    expect(component['editing']).toBe(false);
    expect(component.reasonType()).toBeNull();
    expect(component.canSave()).toBe(false);

    component.reasonText.set('reason');
    expect(component.canSave()).toBe(false);

    component.reasonType.set(HouseholdLockReason.MISUSE_OF_SERVICES);
    expect(component.canSave()).toBe(true);

    component.reasonText.set('   ');
    expect(component.canSave()).toBe(false);
  });

  it('saving closes the dialog with the chosen category, the trimmed reason and the end date', () => {
    const component = createComponent();
    component.reasonType.set(HouseholdLockReason.BANNED_FROM_PREMISES);
    component.reasonText.set('  reason  ');
    component.lockedUntil.set(new Date(2027, 0, 15));

    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({
      reasonType: HouseholdLockReason.BANNED_FROM_PREMISES,
      reasonText: 'reason',
      lockedUntil: '2027-01-15'
    });
  });

  it('editing a lock opens with its category, reason and end date', () => {
    const component = createComponent({
      reasonType: HouseholdLockReason.CODE_OF_CONDUCT_VIOLATION,
      reasonText: 'old reason',
      lockedUntil: '2027-01-15'
    });

    expect(component['editing']).toBe(true);
    expect(component.reasonType()).toBe(HouseholdLockReason.CODE_OF_CONDUCT_VIOLATION);
    expect(component.reasonText()).toBe('old reason');
    expect(dayjs(component.lockedUntil()).format('YYYY-MM-DD')).toBe('2027-01-15');
    expect(component.canSave()).toBe(true);
  });

  it('an end date of today stays valid when editing a lock, a new lock starts tomorrow at the earliest', () => {
    const today = dayjs().startOf('day');

    const editing = createComponent({reasonType: HouseholdLockReason.OTHER, reasonText: 'reason', lockedUntil: today.format('YYYY-MM-DD')});
    expect(dayjs(editing['minLockedUntil']).isSame(today, 'day')).toBe(true);

    TestBed.resetTestingModule();
    const creating = createComponent();
    expect(dayjs(creating['minLockedUntil']).isSame(today.add(1, 'day'), 'day')).toBe(true);
  });
});
