import {inject} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {MatIconRegistry} from '@angular/material/icon';

// Registers Material Symbols SVGs (imported as raw strings via angular.json's build "loader"
// option) with MatIconRegistry so `<mat-icon svgIcon="...">` can render them. Call from a field
// initializer so it runs in the component's injection context, next to the icons it registers -
// see the material-icons-migration-evaluation doc for why registration stays local rather than
// one global registry.
export function registerSvgIcons(icons: Record<string, string>): void {
  const iconRegistry = inject(MatIconRegistry);
  const sanitizer = inject(DomSanitizer);
  for (const [name, svg] of Object.entries(icons)) {
    iconRegistry.addSvgIconLiteral(name, sanitizer.bypassSecurityTrustHtml(svg));
  }
}
