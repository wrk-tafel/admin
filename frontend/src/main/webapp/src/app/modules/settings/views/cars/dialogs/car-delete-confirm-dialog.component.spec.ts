import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {CarDeleteConfirmDialogComponent} from './car-delete-confirm-dialog.component';

describe('CarDeleteConfirmDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<CarDeleteConfirmDialogComponent>>;

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
            carName: 'Lieferwagen 123'
          }
        }
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(CarDeleteConfirmDialogComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('renders the affected car', () => {
    const fixture = TestBed.createComponent(CarDeleteConfirmDialogComponent);
    fixture.detectChanges();

    const message: HTMLElement = fixture.nativeElement.querySelector('[testid="message"]');
    expect(message.textContent).toContain('Lieferwagen 123');
  });

  it('closing dialog with true confirms deletion', () => {
    const fixture = TestBed.createComponent(CarDeleteConfirmDialogComponent);
    fixture.componentInstance.dialogRef.close(true);
    fixture.detectChanges();

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('closing dialog without argument cancels deletion', () => {
    const fixture = TestBed.createComponent(CarDeleteConfirmDialogComponent);
    fixture.componentInstance.dialogRef.close();
    fixture.detectChanges();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
