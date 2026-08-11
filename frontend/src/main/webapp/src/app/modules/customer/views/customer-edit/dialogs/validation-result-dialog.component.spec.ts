import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ValidationResultDialogComponent, ValidationResultDialogData} from './validation-result-dialog.component';
import {ValidateCustomerResponse} from '../../../../../api/customer-api.service';

describe('ValidationResultDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<ValidationResultDialogComponent>>;

  const validationResult: ValidateCustomerResponse = {
    valid: true,
    totalSum: 1218.90,
    limit: 4303,
    toleranceValue: 100,
    amountExceededLimit: 0,
    details: {
      incomeSum: 1000,
      familyAllowanceSum: 148,
      childTaxAllowanceSum: 70.90,
      siblingAdditionSum: 0,
      baseLimit: 3289,
      baseLimitCountAdults: 2,
      baseLimitCountChildren: 1,
      additionalAdultsCount: 1,
      additionalAdultsSum: 914,
      additionalChildrenCount: 0,
      additionalChildrenSum: 0
    }
  };

  function createComponent(result: ValidateCustomerResponse = validationResult) {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    TestBed.configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        {provide: MAT_DIALOG_DATA, useValue: {validationResult: result} as ValidationResultDialogData}
      ]
    });

    const fixture = TestBed.createComponent(ValidationResultDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  function textOf(fixture: ReturnType<typeof createComponent>, testId: string): string {
    return fixture.nativeElement.querySelector(`[testid="${testId}"]`)?.textContent?.replace(/\s+/g, ' ')?.trim();
  }

  it('shows every part the income sum is made up of', () => {
    const fixture = createComponent();

    expect(textOf(fixture, 'detail-income')).toContain('1.000,00');
    expect(textOf(fixture, 'detail-familyallowance')).toContain('148,00');
    expect(textOf(fixture, 'detail-childtaxallowance')).toContain('70,90');
    expect(textOf(fixture, 'detail-siblingaddition')).toContain('0,00');
    expect(textOf(fixture, 'total-income')).toContain('1.218,90');
  });

  it('shows every part the limit is made up of', () => {
    const fixture = createComponent();

    expect(textOf(fixture, 'detail-baselimit')).toContain('Grundbetrag (2 Erw., 1 Kind)');
    expect(textOf(fixture, 'detail-baselimit')).toContain('3.289,00');
    expect(textOf(fixture, 'detail-additionaladults')).toContain('1 weiterer Erwachsener');
    expect(textOf(fixture, 'detail-tolerance')).toContain('100,00');
    expect(textOf(fixture, 'total-limit')).toContain('4.303,00');
  });

  it('hides a surcharge row when nobody exceeds the base household size', () => {
    const fixture = createComponent();

    expect(fixture.nativeElement.querySelector('[testid="detail-additionalchildren"]')).toBeNull();
  });

  it('pluralizes the surcharge and base limit labels', () => {
    const fixture = createComponent({
      ...validationResult,
      details: {
        ...validationResult.details,
        baseLimitCountChildren: 3,
        additionalAdultsCount: 2,
        additionalChildrenCount: 1,
        additionalChildrenSum: 548
      }
    });

    expect(textOf(fixture, 'detail-baselimit')).toContain('Grundbetrag (2 Erw., 3 Kinder)');
    expect(textOf(fixture, 'detail-additionaladults')).toContain('2 weitere Erwachsene');
    expect(textOf(fixture, 'detail-additionalchildren')).toContain('1 weiteres Kind');
  });

  it('leaves the children out of the base limit label for a household without any', () => {
    const fixture = createComponent({
      ...validationResult,
      details: {...validationResult.details, baseLimitCountAdults: 1, baseLimitCountChildren: 0}
    });

    expect(textOf(fixture, 'detail-baselimit')).toContain('Grundbetrag (1 Erw.)');
  });

  it('shows the exceeded amount for a household above the limit', () => {
    const fixture = createComponent({
      ...validationResult,
      valid: false,
      totalSum: 5000,
      amountExceededLimit: 697
    });

    expect(textOf(fixture, 'amount-exceeded')).toContain('697,00');
    expect(fixture.nativeElement.querySelector('[testid="title"]').textContent).toContain('Kein Anspruch vorhanden');
  });
});
