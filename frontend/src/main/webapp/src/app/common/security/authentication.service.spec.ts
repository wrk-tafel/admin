import type { MockedObject } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthenticationService } from './authentication.service';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { SUPPRESS_ERROR_TOAST } from '../http/suppress-error-toast.token';
import { GlobalStateService } from '../state/global-state.service';
import { TafelToastrService } from '../components/tafel-toastr/tafel-toastr.service';

describe('AuthenticationService', () => {
    let httpMock: HttpTestingController;

    let router: MockedObject<Router>;
    let globalStateService: MockedObject<GlobalStateService>;
    let toastr: MockedObject<TafelToastrService>;
    let service: AuthenticationService;

    beforeEach(() => {
        const routerSpy = {
            navigate: vi.fn().mockName('Router.navigate').mockResolvedValue(true)
        };
        const globalStateServiceSpy = {
            reset: vi.fn().mockName('GlobalStateService.reset')
        };
        const toastrSpy = {
            error: vi.fn().mockName('TafelToastrService.error'),
            success: vi.fn().mockName('TafelToastrService.success'),
            warning: vi.fn().mockName('TafelToastrService.warning')
        };

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                AuthenticationService,
                {
                    provide: Router,
                    useValue: routerSpy
                },
                {
                    provide: GlobalStateService,
                    useValue: globalStateServiceSpy
                },
                {
                    provide: TafelToastrService,
                    useValue: toastrSpy
                }
            ],
        });

        httpMock = TestBed.inject(HttpTestingController);

        router = TestBed.inject(Router) as MockedObject<Router>;
        globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;
        toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
        service = TestBed.inject(AuthenticationService);
    });

    it('login successful', async () => {
        const loginResponseBody = { passwordChangeRequired: false };
        const userInfoResponseBody = { username: 'test-user', permissions: ['PERM1'] };

        service.login('USER', 'PWD').then(response => {
            expect(response).toEqual({
                successful: true, passwordChangeRequired: false, rateLimited: false, serverUnreachable: false
            });
            expect(service.userInfo()!.username).toBe(userInfoResponseBody.username);
            expect(service.userInfo()!.permissions).toEqual(userInfoResponseBody.permissions);
        });

        const mockLoginReq = httpMock.expectOne('/login');
        expect(mockLoginReq.request.method).toBe('POST');
        expect(mockLoginReq.request.headers.get('Authorization')).toBe('Basic ' + btoa('USER:PWD'));

        const mockLoginResponse = { status: 200, statusText: 'OK' };
        mockLoginReq.flush(loginResponseBody, mockLoginResponse);

        const mockUserInfoReq = httpMock.expectOne('/users/info');
        expect(mockUserInfoReq.request.method).toBe('GET');

        const mockUserInfoResponse = { status: 200, statusText: 'OK' };
        mockUserInfoReq.flush(userInfoResponseBody, mockUserInfoResponse);

        httpMock.verify();

        expect(router.navigate).not.toHaveBeenCalledWith(['/login/passwortaendern']);
    });

    // The server reads the credentials as UTF-8, so a non-ASCII character has to be sent as its
    // UTF-8 bytes - plain btoa() would send it as a single Latin-1 byte and the login would fail
    // even though the password is correct (see #3100).
    it('login sends non-ascii credentials utf-8 encoded', async () => {
        service.login('USER', 'pwdMitÄumlaut');

        const mockLoginReq = httpMock.expectOne('/login');
        const sentHeader = mockLoginReq.request.headers.get('Authorization')!;
        const decodedBytes = Uint8Array.from(atob(sentHeader.replace('Basic ', '')), char => char.charCodeAt(0));
        expect(new TextDecoder().decode(decodedBytes)).toBe('USER:pwdMitÄumlaut');

        mockLoginReq.flush({ passwordChangeRequired: false }, { status: 200, statusText: 'OK' });
        httpMock.expectOne('/users/info').flush({ username: 'test-user', permissions: [] });
    });

    it('login successful but passwordchange is required', async () => {
        const loginResponseBody = { passwordChangeRequired: true };
        const userInfoResponseBody = { username: 'test-user', permissions: [] };

        service.login('USER', 'PWD').then(response => {
            expect(response).toEqual({
                successful: true, passwordChangeRequired: true, rateLimited: false, serverUnreachable: false
            });
            expect(service.userInfo()!.username).toBe(userInfoResponseBody.username);
            expect(service.userInfo()!.permissions).toEqual(userInfoResponseBody.permissions);
        });

        const loginMockReq = httpMock.expectOne('/login');
        expect(loginMockReq.request.method).toBe('POST');
        expect(loginMockReq.request.headers.get('Authorization')).toBe('Basic ' + btoa('USER:PWD'));

        const loginMockResponse = { status: 200, statusText: 'OK' };
        loginMockReq.flush(loginResponseBody, loginMockResponse);

        const mockUserInfoReq = httpMock.expectOne('/users/info');
        expect(mockUserInfoReq.request.method).toBe('GET');

        const mockUserInfoResponse = { status: 200, statusText: 'OK' };
        mockUserInfoReq.flush(userInfoResponseBody, mockUserInfoResponse);

        httpMock.verify();
    });

    it('login failed', async () => {
        service.userInfo.set({ username: 'test123', permissions: [] });

        service.login('USER', 'PWD').then(response => {
            expect(response).toEqual({
                successful: false, passwordChangeRequired: false, rateLimited: false, serverUnreachable: false
            });
            // check if it's reset
            expect(service.userInfo()).toBeNull();
        });

        const loginMockReq = httpMock.expectOne('/login');
        expect(loginMockReq.request.method).toBe('POST');
        expect(loginMockReq.request.headers.get('Authorization')).toBe('Basic ' + btoa('USER:PWD'));

        const loginMockResponse = { status: 403, statusText: 'Forbidden' };
        loginMockReq.flush(null, loginMockResponse);

        httpMock.expectNone('/users/info');

        httpMock.verify();
    });

    it('login failed - rate limited', async () => {
        service.userInfo.set({ username: 'test123', permissions: [] });

        service.login('USER', 'PWD').then(response => {
            expect(response).toEqual({
                successful: false, passwordChangeRequired: false, rateLimited: true, serverUnreachable: false
            });
            // check if it's reset
            expect(service.userInfo()).toBeNull();
        });

        const loginMockReq = httpMock.expectOne('/login');
        expect(loginMockReq.request.method).toBe('POST');
        expect(loginMockReq.request.headers.get('Authorization')).toBe('Basic ' + btoa('USER:PWD'));

        const loginMockResponse = { status: 429, statusText: 'Too Many Requests' };
        loginMockReq.flush(null, loginMockResponse);

        httpMock.expectNone('/users/info');

        httpMock.verify();
    });

    it('login failed - server error surfaces as unreachable rather than a credentials failure', async () => {
        service.login('USER', 'PWD').then(response => {
            expect(response).toEqual({
                successful: false, passwordChangeRequired: false, rateLimited: false, serverUnreachable: true
            });
        });

        const loginMockReq = httpMock.expectOne('/login');
        loginMockReq.flush(null, { status: 503, statusText: 'Service Unavailable' });

        httpMock.expectNone('/users/info');
        httpMock.verify();
    });

    it('login failed - network error (status 0) surfaces as unreachable', async () => {
        service.login('USER', 'PWD').then(response => {
            expect(response).toEqual({
                successful: false, passwordChangeRequired: false, rateLimited: false, serverUnreachable: true
            });
        });

        const loginMockReq = httpMock.expectOne('/login');
        loginMockReq.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

        httpMock.expectNone('/users/info');
        httpMock.verify();
    });

    it('login request suppresses the generic error toast', () => {
        service.login('USER', 'PWD');

        const mockLoginReq = httpMock.expectOne('/login');
        expect(mockLoginReq.request.context.get(SUPPRESS_ERROR_TOAST)).toBe(true);
        mockLoginReq.flush(null, { status: 500, statusText: 'Internal Server Error' });

        httpMock.verify();
    });

    it('loadUserInfo suppresses the generic error toast (so a logged-out visitor never sees an error toast on page load)', () => {
        service.loadUserInfo();

        const mockReq = httpMock.expectOne('/users/info');
        expect(mockReq.request.context.get(SUPPRESS_ERROR_TOAST)).toBe(true);
        mockReq.flush(null, { status: 401, statusText: 'Unauthorized' });

        httpMock.verify();
    });

    it('redirectToLogin without msgKey', () => {
        service.redirectToLogin();

        expect(router.navigate).toHaveBeenCalledWith(['login']);
    });

    it('redirectToLogin with msgKey', () => {
        service.redirectToLogin('key123');

        expect(router.navigate).toHaveBeenCalledWith(['login', 'key123']);
    });

    it('hasPermission - permission exists', () => {
        service.userInfo.set({ username: 'test123', permissions: ['PERM1'] });

        const hasPermission = service.hasPermission('PERM1');

        expect(hasPermission).toBe(true);
    });

    it('hasPermission - permission doesnt exist', () => {
        service.userInfo.set({ username: 'test123', permissions: ['PERM2'] });

        const hasPermission = service.hasPermission('PERM1');

        expect(hasPermission).toBe(false);
    });

    it('hasPermission - no permissions given', () => {
        service.userInfo.set({ username: 'test123', permissions: [] });

        const hasPermission = service.hasPermission('PERM1');

        expect(hasPermission).toBe(false);
    });

    it('getUsername - authenticated', () => {
        service.userInfo.set({ username: 'test-user', permissions: [] });

        const username = service.getUsername();

        expect(username).toBe('test-user');
    });

    it('getUsername - not authenticated', () => {
        const username = service.getUsername();

        expect(username).toEqual(undefined);
    });

    it('hasAnyPermission - no permissions', () => {
        service.userInfo.set({ username: 'test-user', permissions: [] });

        const hasAnyPermission = service.hasAnyPermission();

        expect(hasAnyPermission).toBe(false);
    });

    it('hasAnyPermission - given permissions', () => {
        service.userInfo.set({ username: 'test-user', permissions: ['PERM1'] });

        const hasAnyPermission = service.hasAnyPermission();

        expect(hasAnyPermission).toBe(true);
    });

    it('logout', async () => {
        service.userInfo.set({ username: 'test-user', permissions: ['PERM1'] });

        const logout = firstValueFrom(service.logout());

        const mockReq = httpMock.expectOne('/users/logout');
        expect(mockReq.request.method).toBe('POST');

        // userInfo backs every permission check - dropping it while the request is still running
        // would blank out the page the user is looking at until the redirect happens
        expect(service.userInfo()).not.toBeNull();

        mockReq.flush(null, { status: 200, statusText: 'OK' });
        await logout;

        expect(router.navigate).toHaveBeenCalledWith(['login']);
        expect(service.userInfo()).toBeNull();
        httpMock.verify();
    });

    it('logout - failed request still redirects and clears the session', async () => {
        service.userInfo.set({ username: 'test-user', permissions: ['PERM1'] });

        const logout = firstValueFrom(service.logout());

        const mockReq = httpMock.expectOne('/users/logout');
        mockReq.flush(null, { status: 500, statusText: 'Internal Server Error' });
        await logout;

        expect(router.navigate).toHaveBeenCalledWith(['login']);
        expect(service.userInfo()).toBeNull();
        httpMock.verify();
    });

    // Without this, a re-login in the same tab would render the previous session's distribution
    // snapshot until the next `/sse/distributions` message arrived - see #3530.
    it('logout resets the global distribution state so a re-login does not show stale data', async () => {
        service.userInfo.set({ username: 'test-user', permissions: ['PERM1'] });

        const logout = firstValueFrom(service.logout());

        const mockReq = httpMock.expectOne('/users/logout');
        mockReq.flush(null, { status: 200, statusText: 'OK' });
        await logout;

        expect(globalStateService.reset).toHaveBeenCalled();
        httpMock.verify();
    });

    // A stale `userInfo` after a failed refresh would keep `isAuthenticated()` reporting the old
    // session as authenticated even though the session actually expired - see #3530.
    it('loadUserInfo clears a stale userInfo when the refresh fails', async () => {
        service.userInfo.set({ username: 'test-user', permissions: ['PERM1'] });

        const result = service.loadUserInfo();

        const mockReq = httpMock.expectOne('/users/info');
        mockReq.flush(null, { status: 401, statusText: 'Unauthorized' });

        expect(await result).toBeNull();
        expect(service.userInfo()).toBeNull();
        httpMock.verify();
    });

    // A transient failure (offline, a gateway hiccup) is not proof the session ended - clearing
    // userInfo here would blank every permission-gated element on a page that is still perfectly
    // authenticated, and the next navigation's guard would treat it as a logged-out visit - see #3563.
    it('loadUserInfo keeps the last known userInfo and surfaces a toast when the request fails with a non-401 error', async () => {
        service.userInfo.set({ username: 'test-user', permissions: ['PERM1'] });

        const result = service.loadUserInfo();

        const mockReq = httpMock.expectOne('/users/info');
        mockReq.flush(null, { status: 503, statusText: 'Service Unavailable' });

        expect(await result).toEqual({ username: 'test-user', permissions: ['PERM1'] });
        expect(service.userInfo()).toEqual({ username: 'test-user', permissions: ['PERM1'] });
        expect(toastr.error).toHaveBeenCalledWith('Server nicht verfügbar!', 'Sitzungsprüfung fehlgeschlagen!');
        httpMock.verify();
    });

    it('isAuthenticated true', () => {
        service.userInfo.set({ username: 'test-user', permissions: ['PERM1'] });

        const isAuthenticated = service.isAuthenticated();

        expect(isAuthenticated).toBeTruthy();
    });

    it('isAuthenticated false', () => {
        service.userInfo.set(null);

        const isAuthenticated = service.isAuthenticated();

        expect(isAuthenticated).toBeFalsy();
    });

    it('hasAnyPermissionOf - single permission exists', () => {
        service.userInfo.set({ username: 'test123', permissions: ['PERM1', 'PERM2'] });

        const hasPermission = service.hasAnyPermissionOf(['PERM1']);

        expect(hasPermission).toBe(true);
    });

    it('hasAnyPermissionOf - multiple permissions exist and one does not exist', () => {
        service.userInfo.set({ username: 'test123', permissions: ['PERM1', 'PERM2'] });

        const hasPermission = service.hasAnyPermissionOf(['PERM1', 'PERM2', 'PERM3']);

        expect(hasPermission).toBe(true);
    });

    it('hasAnyPermissionOf - permission doesnt exist', () => {
        service.userInfo.set({ username: 'test123', permissions: ['PERM2'] });

        const hasPermission = service.hasAnyPermissionOf(['PERM1']);

        expect(hasPermission).toBe(false);
    });

    it('hasAnyPermissionOf - no permissions given', () => {
        service.userInfo.set({ username: 'test123', permissions: [] });

        const hasPermission = service.hasAnyPermissionOf(['PERM1']);

        expect(hasPermission).toBe(false);
    });

});
