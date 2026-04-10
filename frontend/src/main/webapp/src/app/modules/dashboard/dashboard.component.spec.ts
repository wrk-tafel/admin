import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DashboardComponent, DashboardData } from './dashboard.component';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SseService } from '../../common/sse/sse.service';
import { ToastrService } from 'ngx-toastr';
import { GlobalStateService } from '../../common/state/global-state.service';
import { signal } from '@angular/core';
import { DistributionItem } from '../../api/distribution-api.service';

describe('DashboardComponent', () => {
    let sseService: MockedObject<SseService>;
    let globalStateService: MockedObject<GlobalStateService>;
    let toastrService: MockedObject<ToastrService>;

    const mockDistribution: DistributionItem = {
        id: 1,
        startedAt: new Date()
    };

    beforeEach((() => {
        const globalStateServiceMock = {
            getCurrentDistribution: vi.fn().mockName("GlobalStateService.getCurrentDistribution").mockReturnValue(signal(mockDistribution).asReadonly()),
            getConnectionState: vi.fn().mockName("GlobalStateService.getConnectionState").mockReturnValue(signal(false).asReadonly())
        };

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: SseService,
                    useValue: {
                        listen: vi.fn().mockName("SseService.listen")
                    }
                },
                {
                    provide: GlobalStateService,
                    useValue: globalStateServiceMock
                },
                {
                    provide: ToastrService,
                    useValue: {
                        success: vi.fn().mockName("ToastrService.success"),
                        error: vi.fn().mockName("ToastrService.error")
                    }
                }
            ]
        }).compileComponents();

        sseService = TestBed.inject(SseService) as MockedObject<SseService>;
        globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;
        toastrService = TestBed.inject(ToastrService) as MockedObject<ToastrService>;
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
        expect(sseService.listen).toHaveBeenCalledWith('/sse/dashboard');
    });

});
