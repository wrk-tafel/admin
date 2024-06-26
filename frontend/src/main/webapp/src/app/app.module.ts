import {BrowserModule} from '@angular/platform-browser';
import {APP_INITIALIZER, DEFAULT_CURRENCY_CODE, LOCALE_ID, NgModule} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {
  CommonModule,
  HashLocationStrategy,
  LocationStrategy,
  NgIf,
  NgOptimizedImage,
  NgTemplateOutlet,
  registerLocaleData
} from '@angular/common';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import localeDeAt from '@angular/common/locales/de-AT';
import {NgScrollbarModule} from 'ngx-scrollbar';

import {IconDirective, IconModule, IconSetService} from '@coreui/icons-angular';
import {AppComponent} from './app.component';

// Import containers
import {DefaultLayoutComponent} from './common/views/default-layout/default-layout.component';
import {DefaultHeaderComponent} from './common/views/default-layout/default-header/default-header.component';
import {P404Component} from './common/views/error/404.component';
import {P500Component} from './common/views/error/500.component';
import {LoginComponent} from './common/views/login/login.component';

import {
  AvatarComponent,
  BadgeComponent,
  BgColorDirective,
  BreadcrumbModule,
  ButtonCloseDirective,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardGroupComponent,
  ColComponent,
  ContainerComponent,
  DropdownModule,
  FormControlDirective,
  FormDirective,
  HeaderModule,
  InputGroupComponent,
  InputGroupTextDirective,
  ModalModule,
  NavItemComponent,
  RowComponent,
  SidebarBrandComponent,
  SidebarComponent,
  SidebarModule,
  SidebarNavComponent,
  SidebarToggleDirective,
  SidebarTogglerComponent,
  TabsModule
} from '@coreui/angular';

// Import routing module
import {AppRoutingModule} from './app.routing';

// Import 3rd party components
import {NgChartsModule} from 'ng2-charts';
import {HTTP_INTERCEPTORS, HttpClientModule, HttpClientXsrfModule} from '@angular/common/http';
import {ApiPathInterceptor} from './common/http/apipath-interceptor.service';
import {ErrorHandlerInterceptor} from './common/http/errorhandler-interceptor.service';
import {LoginPasswordChangeComponent} from './common/views/login-passwordchange/login-passwordchange.component';
import {CookieService} from 'ngx-cookie-service';
import {AuthenticationService} from './common/security/authentication.service';
import {WebsocketService} from './common/websocket/websocket.service';
import {RouterLink, RouterOutlet} from '@angular/router';
import {TafelCommonModule} from './common/tafel-common.module';

registerLocaleData(localeDeAt);

@NgModule({
  imports: [
    TafelCommonModule,
    AppRoutingModule,
    BreadcrumbModule,
    BrowserAnimationsModule,
    BrowserModule,
    CommonModule,
    DropdownModule,
    HeaderModule,
    HttpClientModule,
    HttpClientXsrfModule,
    IconModule,
    ModalModule,
    NgChartsModule,
    NgScrollbarModule,
    ReactiveFormsModule,
    SidebarModule,
    TabsModule,
    ContainerComponent,
    NgIf,
    RouterLink,
    RouterOutlet,
    SidebarBrandComponent,
    SidebarComponent,
    SidebarNavComponent,
    SidebarToggleDirective,
    SidebarTogglerComponent,
    NavItemComponent,
    BadgeComponent,
    AvatarComponent,
    IconDirective,
    BgColorDirective,
    ButtonDirective,
    CardBodyComponent,
    CardComponent,
    CardGroupComponent,
    ColComponent,
    ContainerComponent,
    FormControlDirective,
    FormDirective,
    IconDirective,
    InputGroupComponent,
    InputGroupTextDirective,
    RouterLink,
    RowComponent,
    NgOptimizedImage,
    ButtonDirective,
    ColComponent,
    FormControlDirective,
    FormDirective,
    IconDirective,
    InputGroupComponent,
    InputGroupTextDirective,
    RowComponent,
    ButtonDirective,
    ColComponent,
    ContainerComponent,
    FormControlDirective,
    IconDirective,
    InputGroupComponent,
    InputGroupTextDirective,
    RowComponent,
    ButtonDirective,
    ColComponent,
    ContainerComponent,
    FormControlDirective,
    IconModule,
    InputGroupComponent,
    InputGroupTextDirective,
    RowComponent,
    ButtonCloseDirective,
    NgTemplateOutlet
  ],
  declarations: [
    AppComponent,
    DefaultHeaderComponent,
    DefaultLayoutComponent,
    LoginComponent,
    LoginPasswordChangeComponent,
    P404Component,
    P500Component
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
    IconSetService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
