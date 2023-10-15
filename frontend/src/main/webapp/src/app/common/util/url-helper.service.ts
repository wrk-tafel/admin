import {Injectable} from '@angular/core';
import {PlatformLocation} from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class UrlHelperService {

    constructor(private platformLocation: PlatformLocation) {
    }

    getBaseUrl(): string {
        let pathname = this.platformLocation.pathname;
        if (pathname === '/') {
            pathname = '';
        }
        if (pathname.endsWith('/')) {
            pathname = pathname.slice(0, -1);
        }

        const baseUrl = this.platformLocation.protocol + '//' + this.platformLocation.hostname + ':' + this.platformLocation.port;
        const path = pathname.replaceAll('//', '/');

        const absoluteUrl = baseUrl + path;
        return absoluteUrl;
    }

}
