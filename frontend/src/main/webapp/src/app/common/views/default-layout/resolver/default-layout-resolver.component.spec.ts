import {TestBed} from '@angular/core/testing';
import {firstValueFrom, of} from 'rxjs';
import {WebsocketService} from '../../../websocket/websocket.service';
import {DefaultLayoutResolver} from './default-layout-resolver.component';
import {GlobalStateService} from '../../../state/global-state.service';
import {RxStompState} from '@stomp/rx-stomp';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

describe('DefaultLayoutResolver', () => {
  let websocketService: jasmine.SpyObj<WebsocketService>;
  let globalStateService: jasmine.SpyObj<GlobalStateService>;
  let resolver: DefaultLayoutResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: WebsocketService,
          useValue: jasmine.createSpyObj('WebsocketService', ['connect'])
        },
        {
          provide: GlobalStateService,
          useValue: jasmine.createSpyObj('GlobalStateService', ['init'])
        },
        DefaultLayoutResolver
      ]
    });

    websocketService = TestBed.inject(WebsocketService) as jasmine.SpyObj<WebsocketService>;
    globalStateService = TestBed.inject(GlobalStateService) as jasmine.SpyObj<GlobalStateService>;
    resolver = TestBed.inject(DefaultLayoutResolver);
  });

  it('resolve', () => {
    const mockWsConnect = firstValueFrom(of<RxStompState>(RxStompState.OPEN));
    websocketService.connect.and.returnValue(mockWsConnect);
    const mockGlobalStateInit = firstValueFrom(of('2'));
    globalStateService.init.and.returnValue(mockGlobalStateInit);

    /* eslint-disable @typescript-eslint/no-explicit-any */
    resolver.resolve().then((result: any[]) => {
      expect(result[0]).toEqual(RxStompState.OPEN);
      expect(result[1]).toEqual('2');
    });

    expect(websocketService.connect).toHaveBeenCalled();
    expect(globalStateService.init).toHaveBeenCalled();
  });

});
