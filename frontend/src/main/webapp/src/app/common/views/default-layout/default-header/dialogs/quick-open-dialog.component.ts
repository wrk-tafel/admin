import {Component, computed, ElementRef, inject, signal, viewChild} from '@angular/core';
import {toObservable, toSignal} from '@angular/core/rxjs-interop';
import {MatDialogRef} from '@angular/material/dialog';
import {Router} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {catchError, debounceTime, distinctUntilChanged, map, of, switchMap} from 'rxjs';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {faUser} from '@fortawesome/free-solid-svg-icons';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {TafelAutofocusDirective} from '../../../../../common/directive/tafel-autofocus.directive';
import {ITafelNavData, navigationMenuItems} from '../../navigation-menuItems';
import {AuthenticationService} from '../../../../../common/security/authentication.service';
import {GlobalStateService} from '../../../../../common/state/global-state.service';
import {CustomerApiService, CustomerData} from '../../../../../api/customer-api.service';

export interface QuickOpenNavEntry {
  label: string;
  url: string;
  icon?: IconDefinition;
}

/**
 * The palette's navigation targets: every reachable page from the sidebar's menu, flattened to
 * plain links. Section titles carry no target, a group's children are listed with the group name
 * as prefix, and an entry the user could not open anyway is left out entirely - one it lacks the
 * permission for (a child inherits its group's requirement on top of its own), or one that needs
 * an active distribution while none is running.
 */
export function flattenNavigationItems(
  items: ITafelNavData[],
  hasPermission: (permission: string) => boolean,
  distributionActive: boolean
): QuickOpenNavEntry[] {
  const permitted = (item: ITafelNavData) => (item.permissions ?? []).every(hasPermission);
  const available = (item: ITafelNavData) => !(item.activeDistributionRequired && !distributionActive);

  const result: QuickOpenNavEntry[] = [];
  items.forEach(item => {
    if (item.title || !permitted(item) || !available(item)) {
      return;
    }

    if (item.children) {
      item.children
        .filter(child => permitted(child) && available(child) && !!child.url)
        .forEach(child => result.push({
          label: `${item.name} › ${child.name}`,
          url: child.url!,
          icon: child.icon ?? item.icon
        }));
      return;
    }

    if (item.url) {
      result.push({label: item.name, url: item.url, icon: item.icon});
    }
  });
  return result;
}

const SEARCH_DEBOUNCE_MS = 250;
const MIN_CUSTOMER_SEARCH_CHARS = 2;
const CUSTOMER_RESULT_LIMIT = 5;

@Component({
  selector: 'tafel-quick-open-dialog',
  imports: [
    TafelDialogComponent,
    TafelAutofocusDirective,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    FaIconComponent
  ],
  templateUrl: 'quick-open-dialog.component.html',
  host: {
    '(keydown)': 'onKeydown($event)'
  }
})
export class QuickOpenDialogComponent {
  readonly dialogRef = inject(MatDialogRef<QuickOpenDialogComponent>);
  private readonly router = inject(Router);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly globalStateService = inject(GlobalStateService);
  private readonly customerApiService = inject(CustomerApiService);

  private readonly resultList = viewChild.required<ElementRef<HTMLElement>>('resultList');
  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  readonly query = signal('');

  private readonly distribution = this.globalStateService.getCurrentDistribution();

  private readonly navEntries = computed(() =>
    flattenNavigationItems(
      navigationMenuItems,
      permission => this.authenticationService.hasPermission(permission),
      this.distribution() !== null
    )
  );

  readonly navResults = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.navEntries().filter(entry => entry.label.toLowerCase().includes(query));
  });

  private readonly canSearchCustomers = computed(() => this.authenticationService.hasPermission('CUSTOMER'));

  /**
   * `null` means "no customer search ran" (no permission or the query is too short), which hides
   * the whole section - as opposed to an empty array, which renders its "nothing found" state.
   */
  readonly customerResults = toSignal(
    toObservable(computed(() => this.query().trim())).pipe(
      debounceTime(SEARCH_DEBOUNCE_MS),
      distinctUntilChanged(),
      switchMap(query => {
        if (!this.canSearchCustomers() || query.length < MIN_CUSTOMER_SEARCH_CHARS) {
          return of(null);
        }
        return this.customerApiService.searchCustomer(query, null, null, null, undefined, CUSTOMER_RESULT_LIMIT).pipe(
          map(result => result.items ?? []),
          catchError(() => of<CustomerData[]>([]))
        );
      })
    ),
    {initialValue: null}
  );

  readonly resultAnnouncement = computed(() => {
    const parts = [`${this.navResults().length} Navigationseinträge`];
    const customers = this.customerResults();
    if (customers !== null) {
      parts.push(`${customers.length} Kunden`);
    }
    return `${parts.join(' und ')} gefunden`;
  });

  openNavEntry(entry: QuickOpenNavEntry) {
    this.dialogRef.close();
    this.router.navigateByUrl(entry.url);
  }

  openCustomer(customer: CustomerData) {
    this.dialogRef.close();
    this.router.navigate(['/kunden/detail', customer.id]);
  }

  openFirstResult() {
    this.resultButtons()[0]?.click();
  }

  /**
   * Roving focus over the flat list of result buttons: ArrowDown from the input enters the list,
   * ArrowUp from its first entry returns to the input. Focus (not `aria-activedescendant`) carries
   * the position, so every result is announced through its own accessible name.
   */
  onKeydown(event: KeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    const buttons = this.resultButtons();
    if (buttons.length === 0) {
      return;
    }
    event.preventDefault();

    const index = buttons.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowDown') {
      if (index < 0) {
        buttons[0].focus();
      } else if (index < buttons.length - 1) {
        buttons[index + 1].focus();
      }
    } else {
      if (index === 0) {
        this.searchInput().nativeElement.focus();
      } else if (index > 0) {
        buttons[index - 1].focus();
      }
    }
  }

  private resultButtons(): HTMLElement[] {
    return Array.from(this.resultList().nativeElement.querySelectorAll<HTMLElement>('button[data-quick-open-result]'));
  }

  protected readonly faUser = faUser;
}
