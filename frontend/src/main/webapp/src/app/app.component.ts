import {APP_INITIALIZER, Component, DEFAULT_CURRENCY_CODE, inject, LOCALE_ID, OnInit} from '@angular/core';
import {NavigationEnd, provideRouter, Router, RouterLink, RouterOutlet} from '@angular/router';

import {IconDirective, IconModule, IconSetService} from '@coreui/icons-angular';
import {freeSet} from '@coreui/icons';
import {APP_ROUTES} from './app.routes';
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
  TabsModule
} from '@coreui/angular';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {BrowserModule} from '@angular/platform-browser';
import {
  CommonModule,
  HashLocationStrategy,
  LocationStrategy,
  NgIf,
  NgOptimizedImage,
  NgTemplateOutlet
} from '@angular/common';
import {HTTP_INTERCEPTORS, HttpClientModule, HttpClientXsrfModule} from '@angular/common/http';
import {NgScrollbarModule} from 'ngx-scrollbar';
import {ReactiveFormsModule} from '@angular/forms';
import {CookieService} from 'ngx-cookie-service';
import {ErrorHandlerInterceptor} from './common/http/errorhandler-interceptor.service';
import {ApiPathInterceptor} from './common/http/apipath-interceptor.service';
import {WebsocketService} from './common/websocket/websocket.service';
import {AuthenticationService} from './common/security/authentication.service';

@Component({
  // tslint:disable-next-line
  selector: 'body',
  templateUrl: 'app.component.html',
  imports: [
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
    provideRouter(APP_ROUTES),
    IconSetService
  ],
  standalone: true
})

export class AppComponent implements OnInit {
  private router = inject(Router);
  private iconSetService = inject(IconSetService);

  constructor() {
    // iconSet singleton
    this.iconSetService.icons = {...freeSet};
  }

  ngOnInit() {
    this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) {
        return;
      }
      window.scrollTo(0, 0);
    });
  }

}
