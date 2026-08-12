import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {StaticValueChangeDialogComponent} from './static-value-change-dialog.component';

describe('StaticValueChangeDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<StaticValueChangeDialogComponent, boolean>>;

  const createFixture = () => {
    const fixture = TestBed.createComponent(StaticValueChangeDialogComponent);
    fixture.detectChanges();
    return fixture;
  };

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
            label: 'Einkommensgrenze - 2 Erwachsene, 1 Kind',
            oldAmount: 1450,
            newAmount: 1540
          }
        }
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    expect(createFixture().componentInstance).toBeTruthy();
  });

  it('names the changed row and shows the old and the new amount', () => {
    const element: HTMLElement = createFixture().nativeElement;

    expect(element.querySelector('[testid="static-value-change-label"]')?.textContent)
      .toContain('Einkommensgrenze - 2 Erwachsene, 1 Kind');
    expect(element.querySelector('[testid="static-value-change-old"]')?.textContent).toContain('1.450,00');
    expect(element.querySelector('[testid="static-value-change-new"]')?.textContent).toContain('1.540,00');
  });

  it('states that the change takes effect immediately', () => {
    const element: HTMLElement = createFixture().nativeElement;

    expect(element.querySelector('[testid="static-value-change-hint"]')?.textContent)
      .toContain('gilt sofort');
  });

  it('confirming closes with true, cancelling with false', () => {
    const fixture = createFixture();
    const element: HTMLElement = fixture.nativeElement;

    element.querySelector<HTMLButtonElement>('[testid="confirmButton"]')!.click();
    expect(dialogRef.close).toHaveBeenCalledWith(true);

    element.querySelector<HTMLButtonElement>('[testid="cancelButton"]')!.click();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
