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
import {formatIsoDate} from '../../../../common/date/date-values';

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

  const isoDay = (offsetDays: number) => {
    const date = new Date();
    return formatIsoDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + offsetDays));
  };
  const dayAt = (offsetDays: number) => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offsetDays);
  };
  const withScheduled = (scheduledValidFrom = isoDay(30)): StaticValueItem => ({
    ...testIncomeLimit,
    scheduled: {id: 11, validFrom: scheduledValidFrom, amount: 1600}
  });
  const loadWith = (...staticValues: StaticValueItem[]) => {
    settingsApiMock.getStaticValues = vi.fn(() => of<StaticValueListResponse>({staticValues}));
  };

  const sectionOf = (component: SettingsStaticValuesComponent, type: StaticValueTypeEnum) =>
    component['groups']().flatMap(group => group.sections).find(section => section.type === type)!;

  beforeEach(() => {
    dialogResult = true;

    settingsApiMock = {
      getStaticValues: vi.fn(() => of<StaticValueListResponse>({
        staticValues: [testIncomeLimit, testTolerance, testCostContribution]
      })),
      updateStaticValue: vi.fn(() => of(testIncomeLimit)),
      deleteStaticValue: vi.fn(() => of(undefined))
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

  it('gives no heading of its own to the type the group heading already names', () => {
    const component = createComponent();

    expect(sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT).showHeading).toBe(false);
    expect(sectionOf(component, StaticValueTypeEnum.COST_CONTRIBUTION).showHeading).toBe(false);
    expect(sectionOf(component, StaticValueTypeEnum.TOLERANCE).showHeading).toBe(true);
  });

  it('keeps naming a row by its type where the group heading is out of view', () => {
    const component = createComponent();
    const section = sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT);

    expect(component['rowLabel'](section, section.rows[0])).toBe('Einkommensgrenze - 2 Erwachsene, 1 Kind');
  });

  it('describes a single-type group once, on the type itself', () => {
    const component = createComponent();

    expect(component['groups']()[1].description).toBeUndefined();
    expect(sectionOf(component, StaticValueTypeEnum.COST_CONTRIBUTION).description).toContain('pro Ausgabe beiträgt');
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
        oldAmountIsScheduled: false,
        newAmount: 1540,
        validFrom: null
      }
    });
    expect(settingsApiMock.updateStaticValue).toHaveBeenCalledWith(testIncomeLimit.id, {
      ...testIncomeLimit,
      validFrom: isoDay(0),
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

  it('shows the planned column only for a type one of whose rows has a planned amount', () => {
    loadWith(withScheduled(), testTolerance);
    const component = createComponent();

    expect(sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT).columns)
      .toEqual(['qualifier', 'amount', 'scheduled', 'actions']);
    expect(sectionOf(component, StaticValueTypeEnum.TOLERANCE).columns).toEqual(['amount', 'actions']);
  });

  it('announces the dates amounts are already planned from, with how many each', () => {
    loadWith(
      withScheduled('2027-01-01'),
      {...testTolerance, scheduled: {id: 12, validFrom: '2027-01-01', amount: 120}},
      {...testCostContribution, scheduled: {id: 13, validFrom: '2026-12-01', amount: 5}}
    );
    const component = createComponent();

    expect(component['scheduledDates']()).toEqual([
      {validFrom: '2026-12-01', count: 1},
      {validFrom: '2027-01-01', count: 2}
    ]);
  });

  it('announces nothing when no amount is planned', () => {
    expect(createComponent()['scheduledDates']()).toEqual([]);
  });

  it('saveEdit() with a later date plans the amount instead of applying it now', () => {
    const component = createComponent();
    const section = sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT);

    component['startEdit'](testIncomeLimit);
    component['amountControl'].setValue(1540);
    component['validFromControl'].setValue(dayAt(30));
    component['saveEdit'](section, section.rows[0]);

    expect(dialogMock.open).toHaveBeenCalledWith(StaticValueChangeDialogComponent, expect.objectContaining({
      data: expect.objectContaining({oldAmount: 1450, oldAmountIsScheduled: false, newAmount: 1540, validFrom: isoDay(30)})
    }));
    expect(settingsApiMock.updateStaticValue).toHaveBeenCalledWith(testIncomeLimit.id, expect.objectContaining({
      id: testIncomeLimit.id,
      validFrom: isoDay(30),
      amount: 1540
    }));
    expect(toastrMock.success).toHaveBeenCalledWith('Statischer Wert geplant', 'Erfolgreich');
  });

  it('saveEdit() rejects a start date in the past', () => {
    const component = createComponent();
    const section = sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT);

    component['startEdit'](testIncomeLimit);
    component['amountControl'].setValue(1540);
    component['validFromControl'].setValue(dayAt(-1));
    component['saveEdit'](section, section.rows[0]);

    expect(toastrMock.error).toHaveBeenCalledWith('Das Datum darf nicht in der Vergangenheit liegen', 'Fehler');
    expect(dialogMock.open).not.toHaveBeenCalled();
  });

  it('startEditScheduled() edits the planned amount and its date', () => {
    loadWith(withScheduled());
    const component = createComponent();
    const section = sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT);

    component['startEditScheduled'](section.rows[0].staticValue);

    expect(component['editingId']()).toBe(11);
    expect(component['isEditingScheduled'](section.rows[0])).toBe(true);
    expect(component['amountControl'].value).toBe(1600);
    expect(formatIsoDate(component['validFromControl'].value!)).toBe(isoDay(30));
  });

  it('saveEdit() on a planned amount sends the change to the planned row, compared against the plan', () => {
    loadWith(withScheduled());
    const component = createComponent();
    const section = sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT);

    component['startEditScheduled'](section.rows[0].staticValue);
    component['amountControl'].setValue(1650);
    component['saveEdit'](section, section.rows[0]);

    expect(dialogMock.open).toHaveBeenCalledWith(StaticValueChangeDialogComponent, expect.objectContaining({
      data: expect.objectContaining({oldAmount: 1600, oldAmountIsScheduled: true, newAmount: 1650, validFrom: isoDay(30)})
    }));
    expect(settingsApiMock.updateStaticValue).toHaveBeenCalledWith(11, expect.objectContaining({
      id: 11,
      validFrom: isoDay(30),
      amount: 1650
    }));
  });

  it('saveEdit() on a planned amount moved to today applies it now and says the plan is dropped', () => {
    loadWith(withScheduled());
    const component = createComponent();
    const section = sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT);

    component['startEditScheduled'](section.rows[0].staticValue);
    component['validFromControl'].setValue(dayAt(0));
    component['saveEdit'](section, section.rows[0]);

    expect(dialogMock.open).toHaveBeenCalledWith(StaticValueChangeDialogComponent, expect.objectContaining({
      data: expect.objectContaining({
        oldAmount: 1450,
        oldAmountIsScheduled: false,
        newAmount: 1600,
        validFrom: null,
        droppedScheduledFrom: isoDay(30)
      })
    }));
    expect(settingsApiMock.updateStaticValue).toHaveBeenCalledWith(11, expect.objectContaining({
      id: 11,
      validFrom: isoDay(0),
      amount: 1600
    }));
    expect(toastrMock.success).toHaveBeenCalledWith('Statischer Wert gespeichert', 'Erfolgreich');
  });

  it('saveEdit() on a planned amount rejects a date in the past', () => {
    loadWith(withScheduled());
    const component = createComponent();
    const section = sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT);

    component['startEditScheduled'](section.rows[0].staticValue);
    component['validFromControl'].setValue(dayAt(-1));
    component['saveEdit'](section, section.rows[0]);

    expect(toastrMock.error).toHaveBeenCalledWith('Das Datum darf nicht in der Vergangenheit liegen', 'Fehler');
    expect(settingsApiMock.updateStaticValue).not.toHaveBeenCalled();
  });

  it('saveEdit() just ends the edit when a planned amount and its date were left as they were', () => {
    loadWith(withScheduled());
    const component = createComponent();
    const section = sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT);

    component['startEditScheduled'](section.rows[0].staticValue);
    component['saveEdit'](section, section.rows[0]);

    expect(dialogMock.open).not.toHaveBeenCalled();
    expect(component['editingId']()).toBeNull();
  });

  it('removeScheduled() removes the planned amount after confirming it', () => {
    loadWith(withScheduled());
    const component = createComponent();
    const section = sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT);

    component['removeScheduled'](section, section.rows[0]);

    expect(dialogMock.open).toHaveBeenCalledWith(StaticValueChangeDialogComponent, expect.objectContaining({
      data: expect.objectContaining({oldAmount: 1600, newAmount: null, validFrom: isoDay(30)})
    }));
    expect(settingsApiMock.deleteStaticValue).toHaveBeenCalledWith(11);
    expect(toastrMock.success).toHaveBeenCalledWith('Geplanter Wert entfernt', 'Erfolgreich');
  });

  it('removeScheduled() keeps the plan when the confirmation is dismissed', () => {
    dialogResult = false;
    loadWith(withScheduled());
    const component = createComponent();
    const section = sectionOf(component, StaticValueTypeEnum.INCOME_LIMIT);

    component['removeScheduled'](section, section.rows[0]);

    expect(settingsApiMock.deleteStaticValue).not.toHaveBeenCalled();
  });

});
