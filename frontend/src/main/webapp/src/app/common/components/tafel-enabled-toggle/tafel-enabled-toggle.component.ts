import {Component, input, output} from '@angular/core';
import {MatSlideToggleChange, MatSlideToggleModule} from '@angular/material/slide-toggle';

/**
 * The switch that activates or deactivates a single record of a settings list.
 *
 * It is the one place a record's status is both shown and changed: the switch's own position says
 * whether the record is active, so no screen needs a second marker beside it. A deactivated record
 * additionally carries `tafel-inactive` on its row or card, which mutes its text.
 *
 * The accessible name always names the record ("Aktiv - Fahrzeug Bus 1"), so a screen reader can
 * tell one row's switch from the next; in a table, where the column header already says "Aktiv",
 * `showLabel` drops the visible label so it isn't repeated in every row.
 */
@Component({
  selector: 'tafel-enabled-toggle',
  templateUrl: 'tafel-enabled-toggle.component.html',
  imports: [
    MatSlideToggleModule
  ]
})
export class TafelEnabledToggleComponent {
  enabled = input.required<boolean>();
  /** Names the record this switch belongs to, e.g. "Fahrzeug Bus 1". */
  label = input.required<string>();
  /** `false` inside a table, whose "Aktiv" column header is the visible label already. */
  showLabel = input(true);
  testId = input.required<string>();

  enabledChange = output<boolean>();

  /**
   * Controlled: the switch position follows the `enabled` input, never the click itself.
   * `mat-slide-toggle` flips its own state on click, so it is put back here before the change is
   * reported - a parent that accepts the change flips the input, which is what moves the switch,
   * and a parent that rejects it (e.g. a cancelled confirmation dialog) needs to do nothing at all.
   */
  onToggleChange(event: MatSlideToggleChange) {
    event.source.checked = this.enabled();
    this.enabledChange.emit(event.checked);
  }
}
