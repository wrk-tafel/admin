import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideLocationMocks} from '@angular/common/testing';
import {Title} from '@angular/platform-browser';
import {provideRouter, Router, TitleStrategy} from '@angular/router';
import {TafelTitleStrategy} from './tafel-title-strategy';

@Component({selector: 'tafel-title-strategy-test', template: ''})
class TestComponent {
}

describe('TafelTitleStrategy', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'mit-titel',
            title: 'Kunden suchen',
            component: TestComponent
          },
          {
            path: 'ohne-titel',
            component: TestComponent
          }
        ]),
        provideLocationMocks(),
        {
          provide: TitleStrategy,
          useClass: TafelTitleStrategy
        }
      ]
    });
  });

  it('puts the routes title in front of the application name', async () => {
    await TestBed.inject(Router).navigate(['/mit-titel']);

    expect(TestBed.inject(Title).getTitle()).toBe('Kunden suchen - Tafel Admin');
  });

  it('uses the bare application name for a route without a title', async () => {
    await TestBed.inject(Router).navigate(['/ohne-titel']);

    expect(TestBed.inject(Title).getTitle()).toBe('Tafel Admin');
  });
});
