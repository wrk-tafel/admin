// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import {getTestBed} from '@angular/core/testing';
import {BrowserDynamicTestingModule, platformBrowserDynamicTesting} from '@angular/platform-browser-dynamic/testing';
import {registerLocaleData} from '@angular/common';
import localeDeAt from '@angular/common/locales/de-AT';

registerLocaleData(localeDeAt);

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
  {teardown: {destroyAfterEach: true}},
);
