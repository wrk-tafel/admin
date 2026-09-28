import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of, throwError} from 'rxjs';
import type {MockedObject} from 'vitest';
import {CustomerApiService, CustomerLockedItem, CustomerLockedResponse, HouseholdLockReason} from '../../../../api/customer-api.service';
import {CustomerLockedComponent} from './customer-locked.component';

describe('CustomerLockedComponent', () => {
  let customerApiService: MockedObject<CustomerApiService>;

  const openEndedDue: CustomerLockedItem = {
    householdId: 4711,
    name: 'Beispiel Berta',
    lockedAt: '2025-01-10T09:00:00',
    lockedBy: '00100 Max Muster',
    lockReasonType: HouseholdLockReason.BANNED_FROM_PREMISES,
    lockReason: 'Bedrohung von Mitarbeitern',
    lockedUntil: null,
    lockReviewedAt: null,
    lockReviewedBy: null,
    reviewDue: true
  };
  const temporary: CustomerLockedItem = {
    householdId: 4712,
    name: 'Muster Max',
    lockedAt: '2026-09-01T09:00:00',
    lockReasonType: HouseholdLockReason.OTHER,
    lockReason: 'Klärung offen',
    lockedUntil: '2026-12-31',
    reviewDue: false
  };

  const response = (items: CustomerLockedItem[]): CustomerLockedResponse => ({
    items,
    totalCount: items.length,
    currentPage: 1,
    totalPages: 1,
    pageSize: 10
  });

  beforeEach(() => {
    const spy = {
      getLockedCustomers: vi.fn().mockName('CustomerApiService.getLockedCustomers'),
      confirmLockReview: vi.fn().mockName('CustomerApiService.confirmLockReview')
    } as any;

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {provide: CustomerApiService, useValue: spy}
      ]
    });

    customerApiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
  });

  async function render() {
    const fixture = TestBed.createComponent(CustomerLockedComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('loads the first page of every locked customer', async () => {
    customerApiService.getLockedCustomers.mockReturnValue(of(response([openEndedDue, temporary])));

    const fixture = await render();

    expect(customerApiService.getLockedCustomers).toHaveBeenCalledWith(1, 10, false, false);
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[testid="locked-announcement"]')!.textContent).toContain('2 gesperrte Kunden gefunden');
  });

  it('shows the empty state when nobody is locked', async () => {
    customerApiService.getLockedCustomers.mockReturnValue(of(response([])));

    const fixture = await render();

    expect(fixture.nativeElement.querySelector('[testid="locked-empty"]').textContent).toContain('Aktuell ist kein Kunde gesperrt');
  });

  it('shows an error instead of an empty list when loading fails', async () => {
    customerApiService.getLockedCustomers.mockReturnValue(throwError(() => new Error('boom')));

    const fixture = await render();

    expect(fixture.nativeElement.querySelector('[testid="locked-error"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[testid="locked-empty"]')).toBeNull();
  });

  it('requests only the open-ended locks for that filter, from page 1', async () => {
    customerApiService.getLockedCustomers.mockReturnValue(of(response([openEndedDue])));
    const fixture = await render();

    (fixture.componentInstance as any).onFilterChange('openEnded');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(customerApiService.getLockedCustomers).toHaveBeenLastCalledWith(1, 10, true, false);
  });

  it('requests only the locks due for review for that filter', async () => {
    customerApiService.getLockedCustomers.mockReturnValue(of(response([openEndedDue])));
    const fixture = await render();

    (fixture.componentInstance as any).onFilterChange('due');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(customerApiService.getLockedCustomers).toHaveBeenLastCalledWith(1, 10, false, true);
  });

  it('deselecting the active filter falls back to every locked customer', async () => {
    customerApiService.getLockedCustomers.mockReturnValue(of(response([openEndedDue])));
    const fixture = await render();
    (fixture.componentInstance as any).onFilterChange('due');
    fixture.detectChanges();
    await fixture.whenStable();

    (fixture.componentInstance as any).onFilterChange(undefined);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(customerApiService.getLockedCustomers).toHaveBeenLastCalledWith(1, 10, false, false);
  });

  it('a new page size starts over at page 1', async () => {
    customerApiService.getLockedCustomers.mockReturnValue(of(response([openEndedDue])));
    const fixture = await render();

    (fixture.componentInstance as any).onPage({pageIndex: 2, pageSize: 10, length: 50});
    fixture.detectChanges();
    await fixture.whenStable();
    expect(customerApiService.getLockedCustomers).toHaveBeenLastCalledWith(3, 10, false, false);

    (fixture.componentInstance as any).onPage({pageIndex: 2, pageSize: 25, length: 50});
    fixture.detectChanges();
    await fixture.whenStable();
    expect(customerApiService.getLockedCustomers).toHaveBeenLastCalledWith(1, 25, false, false);
  });

  it('confirming a review calls the backend and reloads the list', async () => {
    customerApiService.getLockedCustomers.mockReturnValue(of(response([openEndedDue])));
    customerApiService.confirmLockReview.mockReturnValue(of(undefined));
    const fixture = await render();
    customerApiService.getLockedCustomers.mockClear();

    (fixture.componentInstance as any).confirmReview(openEndedDue);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(customerApiService.confirmLockReview).toHaveBeenCalledWith(4711);
    expect(customerApiService.getLockedCustomers).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[testid="locked-announcement"]').textContent)
      .toContain('Sperre von Kunde 4711 als überprüft bestätigt');
  });

  it('treats a lock without an end date as open-ended', async () => {
    customerApiService.getLockedCustomers.mockReturnValue(of(response([])));
    const fixture = await render();
    const component = fixture.componentInstance as any;

    expect(component.isOpenEnded(openEndedDue)).toBe(true);
    expect(component.isOpenEnded(temporary)).toBe(false);
  });
});
