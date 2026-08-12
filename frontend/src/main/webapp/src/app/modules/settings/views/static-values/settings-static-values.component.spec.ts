import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {MatDialog} from '@angular/material/dialog';
import {provideRouter} from '@angular/router';
import {SettingsStaticValuesComponent} from './settings-static-values.component';
import {SettingsApiService, StaticValueItem, StaticValueListResponse, StaticValueTypeEnum} from '../../../../api/settings-api.service';
import {of} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {StaticValueChangeDialogComponent} from './dialogs/static-value-change-dialog.component';

describe('SettingsStaticValuesComponent', () => {
  const testIncomeLimit: StaticValueItem = {
    id: 1,
    type: StaticValueTypeEnum.INCOME_LIMIT,
    validFrom: '2026-01-01',
    validTo: '2999-12-31',
    amount: 1450,
    countAdults: 2,
    countChildren: 1,
    age: null
  };
  const testTolerance: StaticValueItem = {
    id: 2,
    type: StaticValueTypeEnum.TOLERANCE,
    validFrom: '2026-01-01',
    validTo: '2999-12-31',
    amount: 100,
    // The seeded tolerance row carries counts its type never looks up - they must not show up
    // as a qualifier, see staticValueTypeSpecs.
    countAdults: 0,
    countChildren: 0,
    age: null
  };
  const testCostContribution: StaticValueItem = {
    id: 3,
    type: StaticValueTypeEnum.COST_CONTRIBUTION,
    validFrom: '2026-01-01',
    validTo: '2999-12-31',
    amount: 4,
    countAdults: null,
    countChildren: null,
    age: null
  };

  let settingsApiMock: Partial<SettingsApiService>;
  let toastrMock: Partial<TafelToastrService>;
  let dialogMock: Partial<MatDialog>;
  let dialogResult: boolean | undefined;

  const createComponent = () => {
    const fixture = TestBed.createComponent(SettingsStaticValuesComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  const sectionOf = (component: SettingsStaticValuesComponent, type: StaticValueTypeEnum) =>
    component['groups']().flatMap(group => group.sections).find(section => section.type === type)!;

  beforeEach(() => {
    dialogResult = true;

    settingsApiMock = {
      getStaticValues: vi.fn(() => of<StaticValueListResponse>({
        staticValues: [testIncomeLimit, testTolerance, testCostContribution]
      })),
      updateStaticValue: vi.fn(() => of(testIncomeLimit))
    };

    toastrMock = {
      success: vi.fn(),
      error: vi.fn()
    };

    dialogMock = {
      open: vi.fn(() => ({afterClosed: () => of(dialogResult)}) as never)
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([]),
        {provide: SettingsApiService, useValue: settingsApiMock},
        {provide: TafelToastrService, useValue: toastrMock},
        {provide: MatDialog, useValue: dialogMock}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    expect(createComponent()).toBeTruthy();
  });

  it('loads static values on init', () => {
    const component = createComponent();

    expect(component['staticValues']()?.staticValues.length).toBe(3);
  });

  it('splits the values into the income and the cost contribution group', () => {
    const component = createComponent();

    expect(component['groups']().map(group => group.key)).toEqual(['income', 'costContribution']);
    expect(component['groups']()[0].sections.map(section => section.type))
      .toEqual([StaticValueTypeEnum.INCOME_LIMIT, StaticValueTypeEnum.TOLERANCE]);
    expect(component['groups']()[1].sections.map(section => section.type))
      .toEqual([StaticValueTypeEnum.COST_CONTRIBUTION]);
  });

  it('keeps the position in the loaded list as the row index, across groups', () => {
    const component = createComponent();

    expect(sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT).rows[0].index).toBe(0);
    expect(sectionOf(component, StaticValueTypeEnum.TOLERANCE).rows[0].index).toBe(1);
    expect(sectionOf(component, StaticValueTypeEnum.COST_CONTRIBUTION).rows[0].index).toBe(2);
  });

  it('qualifies a row only by the fields its type is looked up by', () => {
    const component = createComponent();

    expect(sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT).rows[0].qualifier).toBe('2 Erwachsene, 1 Kind');
    expect(sectionOf(component, StaticValueTypeEnum.TOLERANCE).rows[0].qualifier).toBeNull();
  });

  it('shows the qualifier column only for a type whose rows differ in one', () => {
    const component = createComponent();

    expect(sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT).columns).toEqual(['qualifier', 'amount', 'actions']);
    expect(sectionOf(component, StaticValueTypeEnum.TOLERANCE).columns).toEqual(['amount', 'actions']);
  });

  it('leaves out a type that has no value at all', () => {
    const component = createComponent();

    expect(component['groups']().flatMap(group => group.sections).map(section => section.type))
      .not.toContain(StaticValueTypeEnum.FAMILY_ALLOWANCE);
  });

  it('startEdit() enters edit mode for the given row and prefills the amount', () => {
    const component = createComponent();

    component['startEdit'](testIncomeLimit);

    expect(component['editingId']()).toBe(testIncomeLimit.id);
    expect(component['amountControl'].value).toBe(testIncomeLimit.amount);
  });

  it('cancelEdit() leaves edit mode without saving', () => {
    const component = createComponent();

    component['startEdit'](testIncomeLimit);
    component['cancelEdit']();

    expect(component['editingId']()).toBeNull();
    expect(settingsApiMock.updateStaticValue).not.toHaveBeenCalled();
  });

  it('saveEdit() confirms the change before sending it', () => {
    const component = createComponent();
    const section = sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT);

    component['startEdit'](testIncomeLimit);
    component['amountControl'].setValue(1540);
    component['saveEdit'](section, section.rows[0]);

    expect(dialogMock.open).toHaveBeenCalledWith(StaticValueChangeDialogComponent, {
      width: '600px',
      data: {
        label: 'Einkommensgrenze - 2 Erwachsene, 1 Kind',
        oldAmount: 1450,
        newAmount: 1540
      }
    });
    expect(settingsApiMock.updateStaticValue).toHaveBeenCalledWith(testIncomeLimit.id, {
      ...testIncomeLimit,
      amount: 1540
    });
    expect(toastrMock.success).toHaveBeenCalled();
    expect(component['editingId']()).toBeNull();
  });

  it('saveEdit() sends nothing when the confirmation is dismissed', () => {
    dialogResult = false;
    const component = createComponent();
    const section = sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT);

    component['startEdit'](testIncomeLimit);
    component['amountControl'].setValue(1540);
    component['saveEdit'](section, section.rows[0]);

    expect(settingsApiMock.updateStaticValue).not.toHaveBeenCalled();
    expect(component['editingId']()).toBe(testIncomeLimit.id);
  });

  it('saveEdit() just ends the edit when the amount was left as it was', () => {
    const component = createComponent();
    const section = sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT);

    component['startEdit'](testIncomeLimit);
    component['saveEdit'](section, section.rows[0]);

    expect(dialogMock.open).not.toHaveBeenCalled();
    expect(settingsApiMock.updateStaticValue).not.toHaveBeenCalled();
    expect(component['editingId']()).toBeNull();
  });

  it('saveEdit() rejects an emptied amount instead of sending it', () => {
    const component = createComponent();
    const section = sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT);

    component['startEdit'](testIncomeLimit);
    component['amountControl'].setValue(null);
    component['saveEdit'](section, section.rows[0]);

    expect(toastrMock.error).toHaveBeenCalledWith('Bitte einen Betrag eingeben', 'Fehler');
    expect(dialogMock.open).not.toHaveBeenCalled();
    expect(settingsApiMock.updateStaticValue).not.toHaveBeenCalled();
  });

});
