import {DEFAULT_CURRENCY_CODE, LOCALE_ID, provideZonelessChangeDetection} from '@angular/core';
import {registerLocaleData} from '@angular/common';
import localeDe from '@angular/common/locales/de';

registerLocaleData(localeDe, 'de-DE');

export default [
  provideZonelessChangeDetection(),
  {
    provide: LOCALE_ID,
    useValue: 'de-DE'
  },
  {
    provide: DEFAULT_CURRENCY_CODE,
    useValue: 'EUR'
  },
];
