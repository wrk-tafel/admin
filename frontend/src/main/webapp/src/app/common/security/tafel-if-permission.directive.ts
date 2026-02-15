import {Directive, effect, inject, input, TemplateRef, ViewContainerRef} from '@angular/core';
import {AuthenticationService} from './authentication.service';

@Directive({
  selector: '[tafelIfPermission]',
  standalone: true
})
export class TafelIfPermissionDirective {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  private readonly templateRef = inject(TemplateRef<any>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authenticationService = inject(AuthenticationService);

  tafelIfPermission = input.required<string>();

  constructor() {
    effect(() => {
      const permission = this.tafelIfPermission();
      if (this.authenticationService.hasPermission(permission)) {
        this.viewContainer.clear();
        this.viewContainer.createEmbeddedView(this.templateRef);
      } else {
        this.viewContainer.clear();
      }
    });
  }
}
