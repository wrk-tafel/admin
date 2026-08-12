import {userAgentDeviceType, userAgentLabel} from './user-agent-label.util';

describe('user-agent-label.util', () => {

  describe('userAgentLabel', () => {
    it('returns a generic label when the user agent is missing', () => {
      expect(userAgentLabel(null)).toEqual('Unbekanntes Gerät');
      expect(userAgentLabel(undefined)).toEqual('Unbekanntes Gerät');
      expect(userAgentLabel('')).toEqual('Unbekanntes Gerät');
    });

    it('recognizes Chrome on Windows', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
      expect(userAgentLabel(ua)).toEqual('Chrome unter Windows');
    });

    it('recognizes Edge on Windows (not misdetected as Chrome)', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
        + 'Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0';
      expect(userAgentLabel(ua)).toEqual('Edge unter Windows');
    });

    it('recognizes Firefox on Linux', () => {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0';
      expect(userAgentLabel(ua)).toEqual('Firefox unter Linux');
    });

    it('recognizes Safari on macOS', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
      expect(userAgentLabel(ua)).toEqual('Safari unter macOS');
    });

    it('recognizes Safari on iPhone (not misdetected as macOS)', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) '
        + 'Version/17.5 Mobile/15E148 Safari/604.1';
      expect(userAgentLabel(ua)).toEqual('Safari unter iOS');
    });

    it('recognizes Chrome on Android', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';
      expect(userAgentLabel(ua)).toEqual('Chrome unter Android');
    });

    it('recognizes Chrome-on-iOS (CriOS) as Chrome, not Safari', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) '
        + 'CriOS/128.0.0.0 Mobile/15E148 Safari/604.1';
      expect(userAgentLabel(ua)).toEqual('Chrome unter iOS');
    });

    it('falls back to a generic label for an unrecognized user agent', () => {
      expect(userAgentLabel('some-bot/1.0')).toEqual('Unbekannter Browser unter unbekanntem System');
    });
  });

  describe('userAgentDeviceType', () => {
    it('returns unknown when the user agent is missing or unrecognized', () => {
      expect(userAgentDeviceType(null)).toEqual('unknown');
      expect(userAgentDeviceType(undefined)).toEqual('unknown');
      expect(userAgentDeviceType('some-bot/1.0')).toEqual('unknown');
    });

    it('recognizes a desktop browser', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
      expect(userAgentDeviceType(ua)).toEqual('desktop');
    });

    it('recognizes an iPhone', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) '
        + 'Version/17.5 Mobile/15E148 Safari/604.1';
      expect(userAgentDeviceType(ua)).toEqual('mobile');
    });

    // An Android user agent carries "Linux" too, so the mobile tokens have to win.
    it('recognizes an Android phone rather than reading it as a Linux desktop', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';
      expect(userAgentDeviceType(ua)).toEqual('mobile');
    });

    it('counts a tablet as mobile', () => {
      const ua = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/604.1';
      expect(userAgentDeviceType(ua)).toEqual('mobile');
    });
  });
});
