import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ShopDisableConfirmDialogComponent} from './shop-disable-confirm-dialog.component';

describe('ShopDisableConfirmDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<ShopDisableConfirmDialogComponent>>;

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
            shopName: 'Billa',
            routeStopLabels: ['Route 1 (14:00)', 'Route 3 (09:40)']
          }
        }
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(ShopDisableConfirmDialogComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('renders the affected routes', () => {
    const fixture = TestBed.createComponent(ShopDisableConfirmDialogComponent);
    fixture.detectChanges();

    const message: HTMLElement = fixture.nativeElement.querySelector('[testid="message"]');
    expect(message.textContent).toContain('Billa');
    expect(message.textContent).toContain('Route 1 (14:00)');
    expect(message.textContent).toContain('Route 3 (09:40)');
  });

  it('closing dialog with true confirms deactivation', () => {
    const fixture = TestBed.createComponent(ShopDisableConfirmDialogComponent);
    fixture.componentInstance.dialogRef.close(true);
    fixture.detectChanges();

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('closing dialog without argument cancels deactivation', () => {
    const fixture = TestBed.createComponent(ShopDisableConfirmDialogComponent);
    fixture.componentInstance.dialogRef.close();
    fixture.detectChanges();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
