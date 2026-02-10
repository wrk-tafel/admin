import { PlatformLocation } from '@angular/common';
import { UrlHelperService } from './url-helper.service';

describe('UrlHelperService', () => {

    let overwriteProtocol: string;
    let overwriteTestPathname: string;

    function setup() {
        const platformLocationSpy = {
            hostname: 'testhost',
            port: '1234',
            pathname: overwriteTestPathname ?? '/subpath',
            protocol: overwriteProtocol ?? 'http:'
        };

        const service = new UrlHelperService(platformLocationSpy as any);

        return { service, platformLocationSpy };
    }

    afterEach(() => {
        overwriteProtocol = undefined;
        overwriteTestPathname = undefined;
    });

    it('client configured correctly with http', () => {
        const { service } = setup();

        const basePath = service.getBaseUrl();

        expect(basePath).toBe('http://testhost:1234/subpath');
    });

    it('client configured correctly with https', () => {
        overwriteProtocol = 'https:';
        const { service } = setup();

        const basePath = service.getBaseUrl();

        expect(basePath).toBe('https://testhost:1234/subpath');
    });

    it('client configured correctly with empty pathname', () => {
        overwriteTestPathname = '/';
        const { service } = setup();

        const basePath = service.getBaseUrl();

        expect(basePath).toBe('http://testhost:1234');
    });

    it('client configured correctly with subPath including trailing slash', () => {
        overwriteTestPathname = '/subpath/';
        const { service } = setup();

        const basePath = service.getBaseUrl();

        expect(basePath).toBe('http://testhost:1234/subpath');
    });

});
