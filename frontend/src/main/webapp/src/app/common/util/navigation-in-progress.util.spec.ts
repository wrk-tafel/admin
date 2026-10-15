import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {provideLocationMocks} from '@angular/common/testing';
import {isNavigatingToAnotherPage} from './navigation-in-progress.util';

@Component({template: ''})
class EmptyComponent {
}

// keeps a navigation to the detail page in progress for a moment, like a resolver loading its data
const slowGuard = () => new Promise<boolean>(resolve => setTimeout(() => resolve(true)));

describe('isNavigatingToAnotherPage', () => {
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {path: 'liste', component: EmptyComponent, canActivate: [slowGuard]},
          {path: 'detail/:id', component: EmptyComponent, canActivate: [slowGuard]}
        ]),
        provideLocationMocks()
      ]
    });
    router = TestBed.inject(Router);
    await router.navigateByUrl('/liste?query=a');
  });

  it('is false while no navigation runs', () => {
    expect(isNavigatingToAnotherPage(router)).toBe(false);
  });

  it('is false for a navigation that only changes the query parameters', async () => {
    const done = router.navigateByUrl('/liste?query=b');
    const observed = isNavigatingToAnotherPage(router);
    await done;

    expect(observed).toBe(false);
  });

  it('is true while a navigation to another page is in progress', async () => {
    const done = router.navigateByUrl('/detail/1');
    const observed = isNavigatingToAnotherPage(router);
    await done;

    expect(observed).toBe(true);
    expect(isNavigatingToAnotherPage(router)).toBe(false);
  });
});
