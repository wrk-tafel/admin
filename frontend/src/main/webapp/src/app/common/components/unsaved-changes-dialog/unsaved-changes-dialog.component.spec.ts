import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MatDialogRef} from '@angular/material/dialog';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {UnsavedChangesDialogComponent} from './unsaved-changes-dialog.component';

describe('UnsavedChangesDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<UnsavedChangesDialogComponent>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        {provide: MatDialogRef, useValue: {close: vi.fn().mockName('MatDialogRef.close')}}
      ]
    }).compileComponents();

    dialogRef = TestBed.inject(MatDialogRef) as MockedObject<MatDialogRef<UnsavedChangesDialogComponent>>;
  });

  it('closes with true when the leave button is clicked', () => {
    const fixture = TestBed.createComponent(UnsavedChangesDialogComponent);
    fixture.detectChanges();

    const okButton: HTMLButtonElement = fixture.nativeElement.querySelector('[testid="okButton"]');
    okButton.click();

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('closes with no result when the cancel button is clicked', () => {
    const fixture = TestBed.createComponent(UnsavedChangesDialogComponent);
    fixture.detectChanges();

    const cancelButton: HTMLButtonElement = fixture.nativeElement.querySelector('[testid="cancelButton"]');
    cancelButton.click();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
