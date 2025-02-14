import {Directive, Input, TemplateRef, ViewContainerRef} from '@angular/core';
import {AuthenticationService} from './authentication.service';

@Directive({
  selector: '[tafelIfPermission]',
})
export class TafelIfPermissionDirective {

  constructor(
    /* eslint-disable @typescript-eslint/no-explicit-any */
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authenticationService: AuthenticationService) {
  }

  @Input() set tafelIfPermission(permission: string) {
    if (this.authenticationService.hasPermission(permission)) {
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }

}
