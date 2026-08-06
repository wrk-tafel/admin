import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {RenameDeviceDialogComponent} from './rename-device-dialog.component';

describe('RenameDeviceDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<RenameDeviceDialogComponent>>;

  function configure(currentLabel: string | null) {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    TestBed.configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        {provide: MAT_DIALOG_DATA, useValue: {currentLabel}}
      ]
    }).compileComponents();
  }

  it('component can be created', () => {
    configure(null);

    const fixture = TestBed.createComponent(RenameDeviceDialogComponent);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('pre-fills with the current label', () => {
    configure('Tafel 1');

    const fixture = TestBed.createComponent(RenameDeviceDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.labelInput()).toEqual('Tafel 1');
  });

  it('pre-fills empty when there is no current label', () => {
    configure(null);

    const fixture = TestBed.createComponent(RenameDeviceDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.labelInput()).toEqual('');
  });

  it('save closes the dialog with the trimmed label', () => {
    configure(null);

    const fixture = TestBed.createComponent(RenameDeviceDialogComponent);
    fixture.componentInstance.labelInput.set('  Tafel 1  ');

    fixture.componentInstance.save();

    expect(dialogRef.close).toHaveBeenCalledWith('Tafel 1');
  });

  it('save closes the dialog with null when the label is blank', () => {
    configure('Old label');

    const fixture = TestBed.createComponent(RenameDeviceDialogComponent);
    fixture.componentInstance.labelInput.set('   ');

    fixture.componentInstance.save();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });

  it('closing the dialog without saving cancels', () => {
    configure(null);

    const fixture = TestBed.createComponent(RenameDeviceDialogComponent);
    fixture.componentInstance.dialogRef.close();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
