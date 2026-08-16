import {TestBed} from '@angular/core/testing';
import {MatIconRegistry} from '@angular/material/icon';
import {DomSanitizer} from '@angular/platform-browser';
import {registerSvgIcons} from './svg-icon.util';

describe('registerSvgIcons', () => {
  it('registers each icon literal under its name', () => {
    const addSvgIconLiteral = vi.fn();
    const bypassSecurityTrustHtml = vi.fn((value: string) => `safe:${value}` as any);
    TestBed.configureTestingModule({
      providers: [
        {provide: MatIconRegistry, useValue: {addSvgIconLiteral}},
        {provide: DomSanitizer, useValue: {bypassSecurityTrustHtml}}
      ]
    });

    TestBed.runInInjectionContext(() => registerSvgIcons({
      search: '<svg>search</svg>',
      close: '<svg>close</svg>'
    }));

    expect(addSvgIconLiteral).toHaveBeenCalledWith('search', 'safe:<svg>search</svg>');
    expect(addSvgIconLiteral).toHaveBeenCalledWith('close', 'safe:<svg>close</svg>');
  });
});
