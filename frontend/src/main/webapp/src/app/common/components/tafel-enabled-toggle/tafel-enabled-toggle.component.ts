import {Component, input, output} from '@angular/core';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';

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
}
