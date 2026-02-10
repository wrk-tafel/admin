import type { MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvatarModule, BadgeModule, BreadcrumbModule, DropdownModule, GridModule, HeaderModule, NavModule, SidebarModule } from '@coreui/angular';
import { IconSetService } from '@coreui/icons-angular';
import { DefaultHeaderComponent } from './default-header.component';
import { AuthenticationService } from '../../../security/authentication.service';
import { BehaviorSubject, of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GlobalStateService } from '../../../state/global-state.service';

describe('DefaultHeaderComponent', () => {
    let component: DefaultHeaderComponent;
    let fixture: ComponentFixture<DefaultHeaderComponent>;
    let authenticationService: MockedObject<AuthenticationService>;
    let globalStateService: MockedObject<GlobalStateService>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                GridModule,
                HeaderModule,
                NavModule,
                BadgeModule,
                AvatarModule,
                DropdownModule,
                BreadcrumbModule,
                SidebarModule
            ],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                IconSetService,
                {
                    provide: AuthenticationService,
                    useValue: {
                        logout: vi.fn().mockName("AuthenticationService.logout"),
                        redirectToLogin: vi.fn().mockName("AuthenticationService.redirectToLogin")
                    }
                },
                {
                    provide: GlobalStateService,
                    useValue: {
                        getConnectionState: vi.fn().mockName("GlobalStateService.getConnectionState")
                    }
                }
            ]
        })
            .compileComponents();

        authenticationService = TestBed.inject(AuthenticationService) as MockedObject<AuthenticationService>;
        globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(DefaultHeaderComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('on init starts listening to connection state', () => {
        globalStateService.getConnectionState.mockReturnValue(new BehaviorSubject(true));

        component.ngOnInit();

        expect(component.sseConnected).toBe(true);
        expect(globalStateService.getConnectionState).toHaveBeenCalled();
    });

    it('logout', () => {
        authenticationService.logout.mockReturnValueOnce(of(null));

        component.logout();

        expect(authenticationService.redirectToLogin).toHaveBeenCalled();
    });

});
