import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {EmployeeDeleteConfirmDialogComponent} from './employee-delete-confirm-dialog.component';

describe('EmployeeDeleteConfirmDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<EmployeeDeleteConfirmDialogComponent>>;

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
            employeeName: 'Max Mustermann'
          }
        }
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(EmployeeDeleteConfirmDialogComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('renders the affected employee', () => {
    const fixture = TestBed.createComponent(EmployeeDeleteConfirmDialogComponent);
    fixture.detectChanges();

    const message: HTMLElement = fixture.nativeElement.querySelector('[testid="message"]');
    expect(message.textContent).toContain('Max Mustermann');
  });

  it('closing dialog with true confirms deletion', () => {
    const fixture = TestBed.createComponent(EmployeeDeleteConfirmDialogComponent);
    fixture.componentInstance.dialogRef.close(true);
    fixture.detectChanges();

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('closing dialog without argument cancels deletion', () => {
    const fixture = TestBed.createComponent(EmployeeDeleteConfirmDialogComponent);
    fixture.componentInstance.dialogRef.close();
    fixture.detectChanges();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
