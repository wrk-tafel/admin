import {enableProdMode} from '@angular/core';
import {environment} from './environments/environment';
import {bootstrapApplication} from '@angular/platform-browser';
import {AppComponent} from './app/app.component';
import {registerLocaleData} from '@angular/common';
import localeDeAt from '@angular/common/locales/de-AT';

if (environment.production) {
  enableProdMode();
}

registerLocaleData(localeDeAt);

bootstrapApplication(AppComponent).catch(e => console.error(e));
