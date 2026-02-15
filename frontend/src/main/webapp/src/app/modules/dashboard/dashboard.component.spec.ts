import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { DashboardComponent, DashboardData } from './dashboard.component';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SseService } from '../../common/sse/sse.service';

describe('DashboardComponent', () => {
    let sseService: MockedObject<SseService>;

    beforeEach((() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: SseService,
                    useValue: {
                        listen: vi.fn().mockName("SseService.listen")
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
        expect(sseService.listen).toHaveBeenCalledWith('/sse/dashboard');
    });

});
