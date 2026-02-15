import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import moment from 'moment';
import { of } from 'rxjs';
import { ActivatedRouteSnapshot } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { StatisticsApiService, StatisticsSettings } from '../../../api/statistics-api.service';
import { StatisticsSettingsResolver } from './statistics-settings-resolver.component';

describe('StatisticsSettingsResolver', () => {
    let apiService: MockedObject<StatisticsApiService>;
    let resolver: StatisticsSettingsResolver;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: StatisticsApiService,
                    useValue: {
                        getSettings: vi.fn().mockName("StatisticsApiService.getSettings")
                    }
                },
                StatisticsSettingsResolver
            ]
        });

        apiService = TestBed.inject(StatisticsApiService) as MockedObject<StatisticsApiService>;
        resolver = TestBed.inject(StatisticsSettingsResolver);
    });

    it('resolve', () => {
        const mockStatisticSettings: StatisticsSettings = {
            availableYears: [2000, 2001],
            distributions: [
                {
                    startDate: moment().subtract(1, 'years').startOf('day').utc().toDate(),
                    endDate: moment().subtract(1, 'years').add(4, 'hours').utc().toDate()
                },
                {
                    startDate: moment().subtract(2, 'years').startOf('day').utc().toDate(),
                    endDate: moment().subtract(2, 'years').add(4, 'hours').utc().toDate()
                }
            ]
        };
        apiService.getSettings.mockReturnValue(of(mockStatisticSettings));

        const activatedRoute = <ActivatedRouteSnapshot><unknown>{ params: {} };
        resolver.resolve(activatedRoute).subscribe((settings: StatisticsSettings) => {
            expect(settings).toEqual(mockStatisticSettings);
        });

        expect(apiService.getSettings).toHaveBeenCalled();
    });

});
