import {BrowserModule} from '@angular/platform-browser';
import {APP_INITIALIZER, DEFAULT_CURRENCY_CODE, LOCALE_ID, NgModule} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {CommonModule, HashLocationStrategy, LocationStrategy, registerLocaleData} from '@angular/common';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import localeDeAt from '@angular/common/locales/de-AT';
import {PerfectScrollbarConfigInterface, PerfectScrollbarModule} from 'ngx-perfect-scrollbar';

import {IconModule, IconSetModule, IconSetService} from '@coreui/icons-angular';
import {AppComponent} from './app.component';

import {DefaultLayoutComponent} from './common/views/default-layout/default-layout.component';
import {P404Component} from './common/views/error/404.component';
import {P500Component} from './common/views/error/500.component';
import {LoginComponent} from './common/views/login/login.component';

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
import {HTTP_INTERCEPTORS, HttpClientModule, HttpClientXsrfModule} from '@angular/common/http';
import {ApiPathInterceptor} from './common/http/apipath-interceptor.service';
import {ErrorHandlerInterceptor} from './common/http/errorhandler-interceptor.service';
import {ModalModule} from 'ngx-bootstrap/modal';
import {PasswordChangeModalComponent} from './modules/user/views/passwordchange-modal/passwordchange-modal.component';
import {PasswordChangeFormComponent} from './modules/user/views/passwordchange-form/passwordchange-form.component';
import {LoginPasswordChangeComponent} from './common/views/login-passwordchange/login-passwordchange.component';
import {CookieService} from 'ngx-cookie-service';
import {AuthenticationService} from './common/security/authentication.service';
import {WebsocketService} from './common/websocket/websocket.service';

registerLocaleData(localeDeAt);

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
      provide: LOCALE_ID,
      useValue: 'de-AT'
    },
    {
      provide: DEFAULT_CURRENCY_CODE,
      useValue: 'EUR'
    },
    {
      provide: CookieService,
      useClass: CookieService
    },
    {
      provide: LocationStrategy,
      useClass: HashLocationStrategy
    },
    IconSetService,
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
      provide: Window,
      useValue: window
    },
    {
      provide: WebsocketService,
      useClass: WebsocketService
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (authService: AuthenticationService) => () => authService.loadUserInfo(),
      deps: [AuthenticationService],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (websocketService: WebsocketService) => () => websocketService.connect(),
      deps: [WebsocketService],
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})

export class AppModule {
}
