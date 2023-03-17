import {HttpClientTestingModule} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {WebsocketService} from '../../../websocket/websocket.service';
import {DefaultLayoutResolver} from './default-layout-resolver.component';
import {GlobalStateService} from '../../../state/global-state.service';
import {RxStompState} from '@stomp/rx-stomp';

describe('DefaultLayoutResolver', () => {
  let websocketService: jasmine.SpyObj<WebsocketService>;
  let globalStateService: jasmine.SpyObj<GlobalStateService>;
  let resolver: DefaultLayoutResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
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
    const mockWsConnect = of<RxStompState>(RxStompState.OPEN).toPromise();
    websocketService.connect.and.returnValue(mockWsConnect);
    const mockGlobalStateInit = of('2').toPromise();
    globalStateService.init.and.returnValue(mockGlobalStateInit);

    resolver.resolve(undefined, undefined).then((result: any[]) => {
      expect(result[0]).toEqual(RxStompState.OPEN);
      expect(result[1]).toEqual('2');
    });

    expect(websocketService.connect).toHaveBeenCalled();
    expect(globalStateService.init).toHaveBeenCalled();
  });

});
