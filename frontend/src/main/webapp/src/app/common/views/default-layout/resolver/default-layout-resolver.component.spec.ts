import {TestBed} from '@angular/core/testing';
import {firstValueFrom, of} from 'rxjs';
import {DefaultLayoutResolver} from './default-layout-resolver.component';
import {GlobalStateService} from '../../../state/global-state.service';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

describe('DefaultLayoutResolver', () => {
  let globalStateService: jasmine.SpyObj<GlobalStateService>;
  let resolver: DefaultLayoutResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: GlobalStateService,
          useValue: jasmine.createSpyObj('GlobalStateService', ['init'])
        },
        DefaultLayoutResolver
      ]
    });

    globalStateService = TestBed.inject(GlobalStateService) as jasmine.SpyObj<GlobalStateService>;
    resolver = TestBed.inject(DefaultLayoutResolver);
  });

  it('resolve', () => {
    const mockGlobalStateInit = firstValueFrom(of('1'));
    globalStateService.init.and.returnValue(mockGlobalStateInit);

    /* eslint-disable @typescript-eslint/no-explicit-any */
    resolver.resolve().then((result: any[]) => {
      expect(result[0]).toEqual('1');
    });

    expect(globalStateService.init).toHaveBeenCalled();
  });

});
