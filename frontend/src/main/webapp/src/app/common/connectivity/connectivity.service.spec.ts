import {TestBed} from '@angular/core/testing';
import {ConnectivityService} from './connectivity.service';

describe('ConnectivityService', () => {

  function setup(initialOnLine: boolean) {
    const listeners: Record<string, ((event: Event) => void)[]> = {};
    const mockWindow = {
      navigator: {onLine: initialOnLine},
      addEventListener: vi.fn((type: string, listener: (event: Event) => void) => {
        (listeners[type] ??= []).push(listener);
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        {provide: Window, useValue: mockWindow}
      ]
    });

    const service = TestBed.inject(ConnectivityService);

    return {service, mockWindow, fire: (type: string) => listeners[type]?.forEach(l => l(new Event(type)))};
  }

  it('reflects navigator.onLine as the initial value', () => {
    const {service} = setup(true);
    expect(service.isOnline()()).toBe(true);
  });

  it('reflects navigator.onLine as false initially when offline', () => {
    const {service} = setup(false);
    expect(service.isOnline()()).toBe(false);
  });

  it('flips to false on an offline event', () => {
    const {service, fire} = setup(true);

    fire('offline');

    expect(service.isOnline()()).toBe(false);
  });

  it('flips to true on an online event', () => {
    const {service, fire} = setup(false);

    fire('online');

    expect(service.isOnline()()).toBe(true);
  });

});
