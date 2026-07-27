import {enableProdMode, provideZonelessChangeDetection} from '@angular/core';
import {environment} from './environments/environment';
import {bootstrapApplication} from '@angular/platform-browser';
import {AppComponent} from './app/app.component';
import {registerLocaleData} from '@angular/common';
import localeDe from '@angular/common/locales/de';
import {appConfig} from './app/app.config';

if (environment.production) {
  enableProdMode();
}

registerLocaleData(localeDe, 'de-DE');

bootstrapApplication(AppComponent, {...appConfig, providers: [provideZonelessChangeDetection(), ...appConfig.providers]})
  .catch(err => console.error(err));
