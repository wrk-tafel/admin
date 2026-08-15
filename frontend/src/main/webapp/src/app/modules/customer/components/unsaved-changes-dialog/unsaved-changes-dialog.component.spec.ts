import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MatDialogRef} from '@angular/material/dialog';
import {UnsavedChangesDialogComponent} from './unsaved-changes-dialog.component';

describe('UnsavedChangesDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<UnsavedChangesDialogComponent>>;

  beforeEach(() => {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    TestBed.configureTestingModule({
      providers: [
        {
          provide: MatDialogRef,
          useValue: dialogRef
        }
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(UnsavedChangesDialogComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('closing dialog with true confirms leaving', () => {
    const fixture = TestBed.createComponent(UnsavedChangesDialogComponent);
    fixture.componentInstance.dialogRef.close(true);
    fixture.detectChanges();

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('closing dialog with no value cancels leaving', () => {
    const fixture = TestBed.createComponent(UnsavedChangesDialogComponent);
    fixture.componentInstance.dialogRef.close();
    fixture.detectChanges();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
