import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { DefaultLayoutResolver } from './default-layout-resolver.component';
import { GlobalStateService } from '../../../state/global-state.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('DefaultLayoutResolver', () => {
    let globalStateService: MockedObject<GlobalStateService>;
    let resolver: DefaultLayoutResolver;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: GlobalStateService,
                    useValue: {
                        init: vi.fn().mockName("GlobalStateService.init")
                    }
                },
                DefaultLayoutResolver
            ]
        });

        globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;
        resolver = TestBed.inject(DefaultLayoutResolver);
    });

    it('resolve', () => {
        resolver.resolve();

        expect(globalStateService.init).toHaveBeenCalled();
    });

});
