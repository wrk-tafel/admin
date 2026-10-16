import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {of, throwError} from 'rxjs';
import {UserSessionsComponent} from './user-sessions.component';
import {UserApiService, UserSessionItem} from '../../../../api/user-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('UserSessionsComponent', () => {
    let userApiService: MockedObject<UserApiService>;
    let toastrService: MockedObject<TafelToastrService>;

    const current: UserSessionItem = {
        id: 'current-key',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
        signedInAt: '2026-10-17T08:00:00',
        lastUsedAt: '2026-10-17T09:00:00',
        current: true
    };
    const other: UserSessionItem = {
        id: 'other-key',
        userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
        signedInAt: '2026-10-16T08:00:00',
        lastUsedAt: '2026-10-16T12:00:00',
        current: false
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: UserApiService,
                    useValue: {
                        getSessions: vi.fn().mockName('UserApiService.getSessions'),
                        endSession: vi.fn().mockName('UserApiService.endSession'),
                        endOtherSessions: vi.fn().mockName('UserApiService.endOtherSessions')
                    }
                },
                {
                    provide: TafelToastrService,
                    useValue: {
                        success: vi.fn().mockName('TafelToastrService.success'),
                        error: vi.fn().mockName('TafelToastrService.error')
                    }
                }
            ]
        });

        userApiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
        toastrService = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
    });

    function render() {
        const fixture = TestBed.createComponent(UserSessionsComponent);
        fixture.detectChanges();
        return fixture;
    }

    function rows(element: HTMLElement): HTMLElement[] {
        return Array.from(element.querySelectorAll('[testid="user-session"]'));
    }

    it('lists the sessions with their device, the current one marked and not endable', () => {
        userApiService.getSessions.mockReturnValue(of({items: [current, other]}));

        const element: HTMLElement = render().nativeElement;
        const [first, second] = rows(element);

        expect(first.textContent).toContain('Firefox unter Windows');
        expect(first.querySelector('[testid="user-session-current-badge"]')).not.toBeNull();
        expect(first.querySelector('[testid="user-session-end"]')).toBeNull();
        expect(second.textContent).toContain('Chrome unter Android');
        expect(second.querySelector('[testid="user-session-end"]')).not.toBeNull();
        expect(second.querySelector('[testid="user-session-times"]')?.textContent).toContain('16.10.2026 08:00');
        expect(element.querySelector('[testid="user-sessions-end-others"]')).not.toBeNull();
    });

    it('says so when there is no other session', () => {
        userApiService.getSessions.mockReturnValue(of({items: [current]}));

        const element: HTMLElement = render().nativeElement;

        expect(element.querySelector('[testid="user-sessions-end-others"]')).toBeNull();
        expect(element.querySelector('[testid="user-sessions-no-others"]')).not.toBeNull();
    });

    it('ends one session and reloads the list', () => {
        userApiService.getSessions.mockReturnValueOnce(of({items: [current, other]})).mockReturnValueOnce(of({items: [current]}));
        userApiService.endSession.mockReturnValue(of(undefined));
        const fixture = render();

        (fixture.nativeElement.querySelector('[testid="user-session-end"]') as HTMLElement).click();
        fixture.detectChanges();

        expect(userApiService.endSession).toHaveBeenCalledWith('other-key');
        expect(toastrService.success).toHaveBeenCalledWith('Sitzung wurde beendet.');
        expect(rows(fixture.nativeElement)).toHaveLength(1);
    });

    it('ends all other sessions and reloads the list', () => {
        userApiService.getSessions.mockReturnValueOnce(of({items: [current, other]})).mockReturnValueOnce(of({items: [current]}));
        userApiService.endOtherSessions.mockReturnValue(of(undefined));
        const fixture = render();

        (fixture.nativeElement.querySelector('[testid="user-sessions-end-others"]') as HTMLElement).click();
        fixture.detectChanges();

        expect(userApiService.endOtherSessions).toHaveBeenCalled();
        expect(toastrService.success).toHaveBeenCalledWith('Alle anderen Sitzungen wurden beendet.');
        expect(rows(fixture.nativeElement)).toHaveLength(1);
    });

    it('shows an error when the list cannot be loaded or a session cannot be ended', () => {
        userApiService.getSessions.mockReturnValue(throwError(() => new Error('failed')));
        userApiService.endSession.mockReturnValue(throwError(() => new Error('failed')));
        const fixture = render();

        fixture.componentInstance.endSession(other);

        expect(toastrService.error).toHaveBeenCalledWith('Sitzungen konnten nicht geladen werden.');
        expect(toastrService.error).toHaveBeenCalledWith('Sitzung konnte nicht beendet werden.');
    });
});
