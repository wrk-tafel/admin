import {Component, input, output} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {registerSvgIcons} from '../../util/svg-icon.util';
import dragIndicatorIcon from '@material-symbols/svg-400/outlined/drag_indicator-fill.svg';

/**
 * The grip that reorders a record in a sortable list.
 *
 * It is a `button` rather than the bare icon it looks like, because Angular CDK's drag-and-drop
 * has no keyboard behaviour of its own: without a focusable, named control that moves the record
 * on arrow keys, the sort order of a list cannot be changed at all without a pointing device.
 *
 * Dragging is unaffected - the consumer keeps `cdkDragHandle` on this component's host element,
 * so the mouse still grabs exactly what it grabbed before.
 */
@Component({
  selector: 'tafel-reorder-handle',
  templateUrl: 'tafel-reorder-handle.component.html',
  imports: [
    MatIcon,
    MatTooltipModule
  ]
})
export class TafelReorderHandleComponent {
  private readonly registerIcons = registerSvgIcons({drag_indicator: dragIndicatorIcon});

  /** Names the record this handle belongs to, e.g. "Fahrzeug Bus 1". */
  label = input.required<string>();
  /** The record's current place in the list, counted from 1 for the announcement. */
  position = input.required<number>();
  /** How many records the list holds, so the announcement can say "2 von 7". */
  count = input.required<number>();
  testId = input.required<string>();

  /** Emits -1 to move the record one place up, 1 to move it one place down. */
  move = output<number>();

  protected onKeydown(event: KeyboardEvent) {
    const offset = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (offset === 0) {
      return;
    }

    // Silently ignored at either end rather than blocked: the handle stays focusable there, so a
    // record at the top can still be dragged and still reports its position.
    const target = this.position() + offset;
    if (target < 1 || target > this.count()) {
      return;
    }

    // Otherwise the arrow key scrolls the page underneath the move.
    event.preventDefault();
    this.move.emit(offset);
  }
}
