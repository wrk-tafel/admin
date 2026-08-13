import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {DashboardComponent, DashboardData} from './dashboard.component';
import {Observable, of} from 'rxjs';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {SseService} from '../../common/sse/sse.service';
import {GlobalStateService} from '../../common/state/global-state.service';
import {signal} from '@angular/core';
import {DistributionItem} from '../../api/distribution-api.service';
import {TafelToastrService} from '../../common/components/tafel-toastr/tafel-toastr.service';

describe('DashboardComponent', () => {
  let sseService: MockedObject<SseService>;
  let globalStateServiceMock: { getCurrentDistribution: ReturnType<typeof vi.fn>; getConnectionState: ReturnType<typeof vi.fn> };

  const mockDistribution: DistributionItem = {
    id: 1,
    startedAt: new Date()
  };

  beforeEach((() => {
    globalStateServiceMock = {
      getCurrentDistribution: vi.fn().mockName('GlobalStateService.getCurrentDistribution')
        .mockReturnValue(signal(mockDistribution).asReadonly()),
      getConnectionState: vi.fn().mockName('GlobalStateService.getConnectionState').mockReturnValue(signal(false).asReadonly())
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: SseService,
          useValue: {
            listen: vi.fn().mockName('SseService.listen')
          }
        },
        {
          provide: GlobalStateService,
          useValue: globalStateServiceMock
        },
        {
          provide: TafelToastrService,
          useValue: {
            success: vi.fn().mockName('TafelToastrService.success'),
            error: vi.fn().mockName('TafelToastrService.error')
          }
        }
      ]
    }).compileComponents();

    sseService = TestBed.inject(SseService) as MockedObject<SseService>;
  }));

  it('component can be created', () => {
    sseService.listen.mockReturnValueOnce(of({}));

    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('init subscribes data', () => {
    const mockData: DashboardData = {
      registeredCustomers: 123,
      logistics: {
        foodAmountTotal: 456,
        foodCollectionsRecordedCount: 789,
        foodCollectionsTotalCount: 654
      },
      statistics: {
        employeeCount: 10,
        selectedShelterNames: ['Shelter 1', 'Shelter 2', 'Shelter 3'],
      }
    };
    sseService.listen.mockReturnValueOnce(of(mockData));

    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    expect(component.data()).toEqual(mockData);
    expect(sseService.listen).toHaveBeenCalledWith('/sse/dashboard', expect.any(Function));
  });

  it('isDistributionActive reflects GlobalStateService, not just presence of a distribution', () => {
    sseService.listen.mockReturnValueOnce(of({}));

    globalStateServiceMock.getCurrentDistribution.mockReturnValue(
      signal<DistributionItem | null>({id: 1, startedAt: new Date(), endedAt: new Date()}).asReadonly()
    );

    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    expect(component.isDistributionActive()).toBe(false);
  });

  it('isStale stays false until the stream has connected at least once', () => {
    // never invokes the connection-state callback - simulates the moment before the first
    // `EventSource.onopen` fires, which must not be mistaken for a drop
    sseService.listen.mockReturnValueOnce(new Observable());

    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    expect(component.isStale()).toBe(false);
  });

  it('isStale turns true once a previously-open stream reports disconnected', () => {
    let connectionStateCallback: ((connected: boolean) => void) | undefined;
    sseService.listen.mockImplementationOnce((_url: string, callback?: (connected: boolean) => void) => {
      connectionStateCallback = callback;
      return new Observable();
    });

    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    connectionStateCallback!(true);
    expect(component.isStale()).toBe(false);

    connectionStateCallback!(false);
    expect(component.isStale()).toBe(true);
  });

});
