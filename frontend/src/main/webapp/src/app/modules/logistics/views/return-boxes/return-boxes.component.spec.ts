import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {of, throwError} from 'rxjs';
import {ReturnBoxesComponent} from './return-boxes.component';
import {ReturnBoxesApiService, ReturnBoxesList} from '../../../../api/return-boxes-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('ReturnBoxesComponent', () => {
  const list: ReturnBoxesList = {
    routes: [{
      routeId: 3,
      routeNumber: 3,
      routeName: 'Route 3',
      shops: [{
        shopId: 30,
        shopName: 'Denns BioMarkt',
        address: 'Hauptstraße 1, 1010 Wien',
        boxes: [
          {description: 'Graue Kisten', amount: 4, since: '2026-09-01', returned: false},
          {description: 'Bananenkartons', amount: 2, since: '2026-09-08', returned: false}
        ]
      }]
    }]
  };

  const apiService = {getReturnBoxes: vi.fn(), setReturned: vi.fn()};
  const toastr = {error: vi.fn()};

  beforeEach(() => {
    vi.resetAllMocks();
    apiService.getReturnBoxes.mockReturnValue(of(list));

    TestBed.configureTestingModule({
      imports: [ReturnBoxesComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: ReturnBoxesApiService, useValue: apiService},
        {provide: TafelToastrService, useValue: toastr}
      ]
    });
  });

  it('loads the boxes and sums up what is still out', () => {
    const component = TestBed.createComponent(ReturnBoxesComponent).componentInstance;

    expect(component.loaded()).toBe(true);
    expect(component.outstandingTotal()).toBe(6);
    expect(component.routeTotal(list.routes[0])).toBe(6);
    expect(component.hasOutstanding(list.routes[0].shops[0])).toBe(true);
  });

  it('replaces the list with the answer of marking a shop as returned', () => {
    const settled: ReturnBoxesList = {
      routes: [{
        ...list.routes[0],
        shops: [{...list.routes[0].shops[0], boxes: list.routes[0].shops[0].boxes.map(box => ({...box, returned: true}))}]
      }]
    };
    apiService.setReturned.mockReturnValue(of(settled));
    const component = TestBed.createComponent(ReturnBoxesComponent).componentInstance;

    component.setReturned(list.routes[0], list.routes[0].shops[0], true);

    expect(apiService.setReturned).toHaveBeenCalledWith(3, 30, true);
    expect(component.outstandingTotal()).toBe(0);
    expect(component.saving()).toBe(false);
  });

  it('reports a failed save and keeps the list', () => {
    apiService.setReturned.mockReturnValue(throwError(() => new Error('boom')));
    const component = TestBed.createComponent(ReturnBoxesComponent).componentInstance;

    component.setReturned(list.routes[0], list.routes[0].shops[0], true);

    expect(toastr.error).toHaveBeenCalled();
    expect(component.outstandingTotal()).toBe(6);
    expect(component.saving()).toBe(false);
  });
});
