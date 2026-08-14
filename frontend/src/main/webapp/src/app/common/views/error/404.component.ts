import {Component} from '@angular/core';
import {NgOptimizedImage} from '@angular/common';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'tafel-error-404',
  templateUrl: '404.component.html',
  imports: [
    NgOptimizedImage,
    RouterLink
  ]
})
export class P404Component {

  // Plain window calls rather than a service: this page is eager (see app.routes.ts) and has to
  // stay free of anything beyond what the login page already pays for.
  public goBack(): void {
    window.history.back();
  }

}
