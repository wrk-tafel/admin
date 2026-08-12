import {Component, input, output} from '@angular/core';
import {MatButtonToggleChange, MatButtonToggleModule} from '@angular/material/button-toggle';
import {EnabledFilter} from './enabled-filter';

/**
 * The Alle/Aktiv/Inaktiv switch above a list whose records are deactivated instead of deleted.
 *
 * One component rather than the same three toggles per screen, so every settings list offers the
 * status filter in the same place, with the same wording and the same test hooks.
 */
@Component({
  selector: 'tafel-enabled-filter',
  templateUrl: 'tafel-enabled-filter.component.html',
  imports: [
    MatButtonToggleModule
  ]
})
export class TafelEnabledFilterComponent {
  value = input.required<EnabledFilter>();
  /** Names the list, e.g. "shops" - the hooks below it are `shops-status-filter`, `shops-filter-all`, ... */
  testIdPrefix = input.required<string>();

  valueChange = output<EnabledFilter>();

  protected onChange(event: MatButtonToggleChange) {
    this.valueChange.emit(event.value as EnabledFilter);
  }
}
