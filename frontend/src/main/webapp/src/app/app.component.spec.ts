import {TestBed} from '@angular/core/testing';
import {AppComponent} from './app.component';
import {provideZonelessChangeDetection} from "@angular/core";

describe('AppComponent', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection()
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

});
