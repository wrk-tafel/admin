import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {CommonModule, HashLocationStrategy, LocationStrategy} from '@angular/common';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {PerfectScrollbarConfigInterface, PerfectScrollbarModule} from 'ngx-perfect-scrollbar';

import {IconModule, IconSetModule, IconSetService} from '@coreui/icons-angular';
import {AppComponent} from './app.component';

import {DefaultLayoutComponent} from './views/common/default-layout/default-layout.component';
import {P404Component} from './views/common/error/404.component';
import {P500Component} from './views/common/error/500.component';
import {LoginComponent} from './views/common/login/login.component';

import {
  AppAsideModule,
  AppBreadcrumbModule,
  AppFooterModule,
  AppHeaderModule,
  AppSidebarModule,
} from '@coreui/angular';

// Import routing module
import {AppRoutingModule} from './app.routing';

// Import 3rd party components
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {TabsModule} from 'ngx-bootstrap/tabs';
import {ChartsModule} from 'ng2-charts';
import {JWT_OPTIONS, JwtHelperService} from '@auth0/angular-jwt';
import {HTTP_INTERCEPTORS, HttpClientModule, HttpClientXsrfModule} from '@angular/common/http';
import {ApiPathInterceptor} from './common/http/apipath-interceptor.service';
import {AuthenticationInterceptor} from './common/http/authentication-interceptor.service';
import {ErrorHandlerInterceptor} from './common/http/errorhandler-interceptor.service';
import { ModalModule } from 'ngx-bootstrap/modal';
import {PasswordChangeModalComponent} from './views/user/views/passwordchange-modal/passwordchange-modal.component';
import {PasswordChangeFormComponent} from './views/user/views/passwordchange-form/passwordchange-form.component';
import {LoginPasswordChangeComponent} from './views/common/login-passwordchange/login-passwordchange.component';

const DEFAULT_PERFECT_SCROLLBAR_CONFIG: PerfectScrollbarConfigInterface = {
  suppressScrollX: true
};

@NgModule({
  imports: [
    AppAsideModule,
    AppBreadcrumbModule.forRoot(),
    AppFooterModule,
    AppHeaderModule,
    AppRoutingModule,
    AppSidebarModule,
    BrowserModule,
    BrowserAnimationsModule,
    BsDropdownModule.forRoot(),
    ChartsModule,
    CommonModule,
    HttpClientModule,
    HttpClientXsrfModule,
    IconModule,
    IconSetModule.forRoot(),
    ModalModule.forRoot(),
    PerfectScrollbarModule,
    ReactiveFormsModule,
    TabsModule.forRoot()
  ],
  declarations: [
    AppComponent,
    DefaultLayoutComponent,
    P404Component,
    P500Component,
    LoginComponent,
    PasswordChangeFormComponent,
    PasswordChangeModalComponent,
    LoginPasswordChangeComponent
  ],
  providers: [
    {
      provide: LocationStrategy,
      useClass: HashLocationStrategy
    },
    IconSetService,
    {
      provide: JWT_OPTIONS,
      useValue: JWT_OPTIONS
    },
    JwtHelperService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorHandlerInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiPathInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthenticationInterceptor,
      multi: true
    },
    {
      provide: Window,
      useValue: window
    }
  ],
  bootstrap: [AppComponent]
})

export class AppModule {
}
