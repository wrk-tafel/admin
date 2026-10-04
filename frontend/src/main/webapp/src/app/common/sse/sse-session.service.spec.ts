import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Subject} from 'rxjs';
import {AuthenticationService} from '../security/authentication.service';
import {SseService} from './sse.service';
import {SseSessionService} from './sse-session.service';

describe('SseSessionService', () => {
  const completedLogin = signal(false);
  const authenticated = signal(false);
  let refused: Subject<void>;
  let sseServiceSpy: {setEnabled: ReturnType<typeof vi.fn>, refused: Subject<void>};
  let authenticationServiceSpy: {
    hasCompletedLogin: () => boolean,
    isAuthenticated: () => boolean,
    checkSessionStillValid: ReturnType<typeof vi.fn>
  };
  let service: SseSessionService;

  beforeEach(() => {
    completedLogin.set(false);
    authenticated.set(false);
    refused = new Subject<void>();
    sseServiceSpy = {setEnabled: vi.fn(), refused};
    authenticationServiceSpy = {
      hasCompletedLogin: () => completedLogin(),
      isAuthenticated: () => authenticated(),
      checkSessionStillValid: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        SseSessionService,
        {provide: SseService, useValue: sseServiceSpy},
        {provide: AuthenticationService, useValue: authenticationServiceSpy}
      ]
    });
    service = TestBed.inject(SseSessionService);
  });

  it('keeps the stream off until the login is complete, and switches it off again afterwards', () => {
    TestBed.tick();
    expect(sseServiceSpy.setEnabled).toHaveBeenLastCalledWith(false);

    completedLogin.set(true);
    TestBed.tick();
    expect(sseServiceSpy.setEnabled).toHaveBeenLastCalledWith(true);

    completedLogin.set(false);
    TestBed.tick();
    expect(sseServiceSpy.setEnabled).toHaveBeenLastCalledWith(false);
  });

  it('asks the server whether the session still exists when a stream is refused', () => {
    authenticated.set(true);
    service.init();

    refused.next();

    expect(authenticationServiceSpy.checkSessionStillValid).toHaveBeenCalledTimes(1);
  });

  it('asks nothing when nobody is logged in', () => {
    service.init();

    refused.next();

    expect(authenticationServiceSpy.checkSessionStillValid).not.toHaveBeenCalled();
  });
});
