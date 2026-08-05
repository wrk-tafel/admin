import { UrlHelperService } from './url-helper.service';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

describe('UrlHelperService', () => {

    let overwriteBaseUri: string | undefined;

    function setup() {
        const documentSpy = {
            baseURI: overwriteBaseUri ?? 'http://testhost:1234/subpath/'
        };

        TestBed.configureTestingModule({
            providers: [
                UrlHelperService,
                { provide: DOCUMENT, useValue: documentSpy }
            ]
        });
        const service = TestBed.inject(UrlHelperService);

        return { service, documentSpy };
    }

    afterEach(() => {
        overwriteBaseUri = undefined;
    });

    it('client configured correctly with http', () => {
        const { service } = setup();

        const basePath = service.getBaseUrl();

        expect(basePath).toBe('http://testhost:1234/subpath');
    });

    it('client configured correctly with https', () => {
        overwriteBaseUri = 'https://testhost:1234/subpath/';
        const { service } = setup();

        const basePath = service.getBaseUrl();

        expect(basePath).toBe('https://testhost:1234/subpath');
    });

    it('client configured correctly with root base href', () => {
        overwriteBaseUri = 'http://testhost:1234/';
        const { service } = setup();

        const basePath = service.getBaseUrl();

        expect(basePath).toBe('http://testhost:1234');
    });

    it('client configured correctly without trailing slash', () => {
        overwriteBaseUri = 'http://testhost:1234/subpath';
        const { service } = setup();

        const basePath = service.getBaseUrl();

        expect(basePath).toBe('http://testhost:1234/subpath');
    });

});
