import {inject, Service} from '@angular/core';

/**
 * A picture of the screen the reporter is describing, attached to their support request.
 *
 * It is taken *before* the support dialog opens, so the page is the one they were looking at rather
 * than a dialog on top of it - there is nothing to filter out afterwards.
 *
 * The library is loaded on demand rather than imported at the top: nobody pays for it until they
 * actually ask for support.
 */
const MAX_WIDTH = 1280;
const QUALITIES = [0.7, 0.4];
const MAX_DATA_URL_LENGTH = 2_000_000;

@Service()
export class ScreenshotService {
  private readonly window = inject(Window);

  /**
   * The current page as a JPEG data URL, or null when it could not be taken - a support request
   * must still go out when the screenshot fails, so nothing here is allowed to throw.
   */
  async capture(): Promise<string | null> {
    try {
      const {toJpeg} = await import('html-to-image');
      const body = this.window.document.body;
      const pixelRatio = Math.min(1, MAX_WIDTH / (body.clientWidth || MAX_WIDTH));

      for (const quality of QUALITIES) {
        const dataUrl = await toJpeg(body, {
          quality,
          pixelRatio,
          backgroundColor: '#ffffff',
          // A stylesheet the browser will not let us read (a font CDN, an extension) makes the
          // whole capture throw otherwise - skipping it costs a little styling, not the screenshot.
          skipFonts: true
        });

        if (dataUrl.length <= MAX_DATA_URL_LENGTH) {
          return dataUrl;
        }
      }

      // Still too large after the lowest quality - a mail nobody can receive helps less than none.
      return null;
    } catch {
      return null;
    }
  }
}
