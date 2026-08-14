import {TestBed} from '@angular/core/testing';
import {ScreenWakeLockService} from './screen-wake-lock.service';

describe('ScreenWakeLockService', () => {
  function setup(options: {supported?: boolean; requestImpl?: () => Promise<WakeLockSentinel>} = {}) {
    const supported = options.supported ?? true;
    const releaseMock = vi.fn().mockResolvedValue(undefined);
    const sentinel = {release: releaseMock} as unknown as WakeLockSentinel;
    const requestMock = vi.fn(options.requestImpl ?? (() => Promise.resolve(sentinel)));

    const navigatorMock: Partial<Navigator> = supported ? {wakeLock: {request: requestMock} as unknown as WakeLock} : {};

    TestBed.configureTestingModule({
      providers: [
        ScreenWakeLockService,
        {provide: Window, useValue: {navigator: navigatorMock}}
      ]
    });

    return {service: TestBed.inject(ScreenWakeLockService), requestMock, releaseMock, sentinel};
  }

  it('reports support when the navigator has the API', () => {
    expect(setup({supported: true}).service.isSupported).toBe(true);
  });

  it('reports no support when the navigator lacks the API', () => {
    expect(setup({supported: false}).service.isSupported).toBe(false);
  });

  it('requests a screen lock when supported', async () => {
    const {service, requestMock} = setup({supported: true});

    await service.request();

    expect(requestMock).toHaveBeenCalledWith('screen');
  });

  it('does nothing when the API is not supported', async () => {
    const {service, requestMock} = setup({supported: false});

    await expect(service.request()).resolves.toBeUndefined();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('does not request a second lock while one is already held', async () => {
    const {service, requestMock} = setup({supported: true});

    await service.request();
    await service.request();

    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('releases a held lock', async () => {
    const {service, releaseMock} = setup({supported: true});
    await service.request();

    await service.release();

    expect(releaseMock).toHaveBeenCalledTimes(1);
  });

  it('does nothing when releasing without a held lock', async () => {
    const {service, releaseMock} = setup({supported: true});

    await expect(service.release()).resolves.toBeUndefined();
    expect(releaseMock).not.toHaveBeenCalled();
  });

  it('allows requesting again after a release', async () => {
    const {service, requestMock} = setup({supported: true});
    await service.request();
    await service.release();

    await service.request();

    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it('swallows a rejected request, e.g. denied permission or battery saver', async () => {
    const {service} = setup({supported: true, requestImpl: () => Promise.reject(new Error('denied'))});

    await expect(service.request()).resolves.toBeUndefined();
  });

  it('swallows a rejected release, e.g. already released by the OS', async () => {
    const {service} = setup({supported: true});
    await service.request();
    const failingRelease = vi.fn().mockRejectedValue(new Error('already released'));
    // @ts-expect-error - reaching into the private sentinel to simulate a release that then fails
    service['sentinel'].release = failingRelease;

    await expect(service.release()).resolves.toBeUndefined();
  });
});
