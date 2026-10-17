import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {StaticValueChangeDialogComponent, StaticValueChangeDialogData} from './static-value-change-dialog.component';

describe('StaticValueChangeDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<StaticValueChangeDialogComponent, boolean>>;

  let data: StaticValueChangeDialogData;

  const createFixture = () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {useValue: data});
    const fixture = TestBed.createComponent(StaticValueChangeDialogComponent);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    data = {
      label: 'Einkommensgrenze - 2 Erwachsene, 1 Kind',
      oldAmount: 1450,
      oldAmountIsScheduled: false,
      newAmount: 1540,
      validFrom: null
    };
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
          useValue: null
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

  it('states from when a planned amount applies, and that the current one stays until then', () => {
    data = {...data, validFrom: '2027-01-01'};
    const element: HTMLElement = createFixture().nativeElement;

    expect(element.querySelector('[testid="static-value-change-valid-from"]')?.textContent).toContain('01.01.2027');
    expect(element.querySelector('[testid="static-value-change-hint"]')?.textContent)
      .toContain('gilt ab 01.01.2027');
    expect(element.querySelector('[testid="confirmButton"]')?.textContent).toContain('Planen');
  });

  it('calls a replaced planned amount what it is', () => {
    data = {...data, oldAmountIsScheduled: true, validFrom: '2027-01-01'};
    const element: HTMLElement = createFixture().nativeElement;

    expect(element.textContent).toContain('Bisher geplant');
  });

  it('confirms the removal of a planned amount', () => {
    data = {...data, oldAmountIsScheduled: true, newAmount: null, validFrom: '2027-01-01'};
    const element: HTMLElement = createFixture().nativeElement;

    expect(element.querySelector('[testid="static-value-change-new"]')).toBeNull();
    expect(element.querySelector('[testid="static-value-change-hint"]')?.textContent).toContain('wird entfernt');
    expect(element.querySelector('[testid="confirmButton"]')?.textContent).toContain('Entfernen');
  });
});
