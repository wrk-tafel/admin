import {TestBed} from '@angular/core/testing';
import {ScreenshotService} from './screenshot.service';

const toJpeg = vi.hoisted(() => vi.fn());
vi.mock('html-to-image', () => ({toJpeg}));

describe('ScreenshotService', () => {
  let service: ScreenshotService;

  const windowMock = {
    document: {body: {clientWidth: 2560}}
  } as unknown as Window;

  beforeEach(() => {
    toJpeg.mockReset();
    TestBed.configureTestingModule({
      providers: [
        ScreenshotService,
        {provide: Window, useValue: windowMock}
      ]
    });
    service = TestBed.inject(ScreenshotService);
  });

  it('captures the page as a jpeg data url, scaled down to a sendable width', async () => {
    toJpeg.mockResolvedValue('data:image/jpeg;base64,AAAA');

    expect(await service.capture()).toBe('data:image/jpeg;base64,AAAA');

    expect(toJpeg).toHaveBeenCalledWith(windowMock.document.body, {
      quality: 0.7,
      pixelRatio: 0.5,
      backgroundColor: '#ffffff',
      skipFonts: true
    });
  });

  it('retries at a lower quality when the first capture is too large to send', async () => {
    toJpeg
      .mockResolvedValueOnce('x'.repeat(2_000_001))
      .mockResolvedValueOnce('data:image/jpeg;base64,small');

    expect(await service.capture()).toBe('data:image/jpeg;base64,small');

    expect(toJpeg).toHaveBeenCalledTimes(2);
    expect(toJpeg.mock.calls[1][1].quality).toBe(0.4);
  });

  it('gives up rather than sending a mail nobody can receive', async () => {
    toJpeg.mockResolvedValue('x'.repeat(2_000_001));

    expect(await service.capture()).toBeNull();
  });

  it('returns null instead of failing the support request when the capture throws', async () => {
    toJpeg.mockRejectedValue(new Error('tainted canvas'));

    expect(await service.capture()).toBeNull();
  });

});
