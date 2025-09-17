import {ComponentFixture, TestBed} from '@angular/core/testing';

import {
  AvatarModule,
  BadgeModule,
  BreadcrumbModule,
  DropdownModule,
  GridModule,
  HeaderModule,
  NavModule,
  SidebarModule
} from '@coreui/angular';
import {IconSetService} from '@coreui/icons-angular';
import {DefaultHeaderComponent} from './default-header.component';
import {AuthenticationService} from '../../../security/authentication.service';
import {BehaviorSubject, of} from 'rxjs';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {GlobalStateService} from '../../../state/global-state.service';
import {provideZonelessChangeDetection} from "@angular/core";

describe('DefaultHeaderComponent', () => {
  let component: DefaultHeaderComponent;
  let fixture: ComponentFixture<DefaultHeaderComponent>;
  let authenticationService: jasmine.SpyObj<AuthenticationService>;
  let globalStateService: jasmine.SpyObj<GlobalStateService>;

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
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        IconSetService,
        {
          provide: AuthenticationService,
          useValue: jasmine.createSpyObj('AuthenticationService', ['logout', 'redirectToLogin'])
        },
        {
          provide: GlobalStateService,
          useValue: jasmine.createSpyObj('GlobalStateService', ['getConnectionState'])
        }
      ]
    })
      .compileComponents();

    authenticationService = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
    globalStateService = TestBed.inject(GlobalStateService) as jasmine.SpyObj<GlobalStateService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DefaultHeaderComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('on init starts listening to connection state', () => {
    globalStateService.getConnectionState.and.returnValue(new BehaviorSubject(true));

    component.ngOnInit();

    expect(component.sseConnected).toBeTrue();
    expect(globalStateService.getConnectionState).toHaveBeenCalled();
  });

  it('logout', () => {
    authenticationService.logout.and.returnValues(of(null));

    component.logout();

    expect(authenticationService.redirectToLogin).toHaveBeenCalled();
  });

});
