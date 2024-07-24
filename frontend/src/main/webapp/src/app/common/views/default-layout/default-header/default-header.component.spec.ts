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
import {RouterTestingModule} from '@angular/router/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {AuthenticationService} from '../../../security/authentication.service';
import {of} from 'rxjs';

describe('DefaultHeaderComponent', () => {
  let component: DefaultHeaderComponent;
  let fixture: ComponentFixture<DefaultHeaderComponent>;
  let authenticationService: jasmine.SpyObj<AuthenticationService>;

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
        HttpClientTestingModule,
        RouterTestingModule,
        SidebarModule
      ],
      providers: [
        IconSetService,
        {
          provide: AuthenticationService,
          useValue: jasmine.createSpyObj('AuthenticationService', ['logout', 'redirectToLogin'])
        }
      ]
    })
      .compileComponents();

    authenticationService = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DefaultHeaderComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('logout', () => {
    authenticationService.logout.and.returnValues(of(null));

    component.logout();

    expect(authenticationService.redirectToLogin).toHaveBeenCalled();
  });

});
