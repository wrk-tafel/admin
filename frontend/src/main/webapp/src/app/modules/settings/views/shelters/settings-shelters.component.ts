import {Component, computed, inject, signal} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {ShelterEditDialogComponent} from './dialogs/shelter-edit-dialog.component';
import {FormatShelterAddressPipe} from '../../../../common/pipes/format-shelter-address.pipe';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {ShelterApiService, ShelterItem} from '../../../../api/shelter-api.service';
import {MatIcon} from '@angular/material/icon';
import {MatButton} from '@angular/material/button';
import {MatTooltipModule} from '@angular/material/tooltip';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import addIcon from '@material-symbols/svg-400/outlined/add-fill.svg';
import infoIcon from '@material-symbols/svg-400/outlined/info-fill.svg';
import keyboardArrowUpIcon from '@material-symbols/svg-400/outlined/keyboard_arrow_up-fill.svg';
import keyboardArrowDownIcon from '@material-symbols/svg-400/outlined/keyboard_arrow_down-fill.svg';
import editIcon from '@material-symbols/svg-400/outlined/edit-fill.svg';
import homeIcon from '@material-symbols/svg-400/outlined/home-fill.svg';
import {
  TafelReorderHandleComponent
} from '../../../../common/components/tafel-reorder-handle/tafel-reorder-handle.component';
import {
  ReorderFeedbackService
} from '../../../../common/components/tafel-reorder-handle/reorder-feedback.service';
import {
  EnabledFilter,
  matchesEnabledFilter
} from '../../../../common/components/tafel-enabled-filter/enabled-filter';
import {
  TafelEnabledFilterComponent
} from '../../../../common/components/tafel-enabled-filter/tafel-enabled-filter.component';
import {
  TafelEnabledToggleComponent
} from '../../../../common/components/tafel-enabled-toggle/tafel-enabled-toggle.component';

@Component({
  selector: 'tafel-settings-shelters',
  templateUrl: 'settings-shelters.component.html',
  imports: [
    FormatShelterAddressPipe,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatIcon,
    MatButton,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    TafelReorderHandleComponent,
    TafelEnabledFilterComponent,
    TafelEnabledToggleComponent,
    MatTooltipModule
  ]
})
export class SettingsSheltersComponent {
  private readonly registerIcons = registerSvgIcons({
    add: addIcon,
    info: infoIcon,
    keyboard_arrow_up: keyboardArrowUpIcon,
    keyboard_arrow_down: keyboardArrowDownIcon,
    edit: editIcon,
    home: homeIcon
  });

  private readonly shelterApiService = inject(ShelterApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly reorderFeedback = inject(ReorderFeedbackService);
  private readonly dialog = inject(MatDialog);

  private readonly _shelters = signal<ShelterItem[]>([]);
  protected readonly shelters = this._shelters;

  private readonly _loaded = signal(false);
  // keeps the "no shelters yet" state from flashing while the list is still on its way
  protected readonly loaded = this._loaded;

  protected readonly totalCount = computed(() => this._shelters().length);
  protected readonly enabledCount = computed(() => this._shelters().filter(shelter => shelter.enabled).length);

  protected readonly enabledFilter = signal<EnabledFilter>('ALL');
  /**
   * A deactivated shelter is never deleted, so the list only ever grows - the filter is what keeps
   * the working list to the shelters the statistics screen actually offers.
   */
  protected readonly visibleShelters = computed(() =>
    this._shelters().filter(shelter => matchesEnabledFilter(shelter.enabled, this.enabledFilter()))
  );

  // which records are expanded, by shelter id rather than by index, so a reorder does not carry the
  // expanded state over to whichever record now sits at that position
  private readonly expandedIds = signal<ReadonlySet<number>>(new Set());

  constructor() {
    this.loadShelters();
  }

  private loadShelters() {
    this.shelterApiService.getAllShelters().subscribe({
      next: data => {
        this._shelters.set(data.shelters);
        this._loaded.set(true);
      },
      error: () => {
        this.toastr.error('Fehler beim Laden der Notschlafstellen', 'Fehler');
        this._loaded.set(true);
      }
    });
  }

  protected editShelter(shelter: ShelterItem) {
    const dialogRef = this.dialog.open(ShelterEditDialogComponent, {
      data: {shelter},
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((updated: ShelterItem | undefined) => {
      if (updated) {
        this.shelterApiService.updateShelter(updated.id, updated).subscribe({
          next: () => {
            this.toastr.success('Notschlafstelle gespeichert', 'Erfolgreich');
            this.loadShelters();
          },
          error: () => this.toastr.error('Speichern fehlgeschlagen', 'Fehler')
        });
      }
    });
  }

  protected toggleShelterVisibility(shelter: ShelterItem, enabled: boolean) {
    const updatedShelter = {
      ...shelter,
      enabled: enabled
    };

    const observer = {
      next: () => {
        this.toastr.success(`Notschlafstelle ${shelter.name} geändert`, 'Erfolgreich');
        this.loadShelters();
      },
      error: () => {
        this.toastr.error('Fehler beim Ändern', 'Fehler');
      }
    };
    this.shelterApiService.updateShelter(updatedShelter.id, updatedShelter).subscribe(observer);
  }

  protected addShelter() {
    const dialogRef = this.dialog.open(ShelterEditDialogComponent, {
      data: {},
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((created: any) => {
      if (created) {
        this.shelterApiService.createShelter(created).subscribe({
          next: () => {
            this.toastr.success('Notschlafstelle erstellt', 'Erfolgreich');
            this.loadShelters();
          },
          error: () => this.toastr.error('Erstellen fehlgeschlagen', 'Fehler')
        });
      }
    });
  }

  protected isExpanded(shelterId: number): boolean {
    return this.expandedIds().has(shelterId);
  }

  protected toggleExpanded(shelterId: number) {
    const expanded = new Set(this.expandedIds());
    if (!expanded.delete(shelterId)) {
      expanded.add(shelterId);
    }
    this.expandedIds.set(expanded);
  }

  protected drop(event: CdkDragDrop<ShelterItem[]>) {
    this.reorder(event.previousIndex, event.currentIndex, false);
  }

  /** The keyboard path of the same reordering - `offset` is -1 for one place up, 1 for one down. */
  protected moveShelter(index: number, offset: number) {
    const targetIndex = index + offset;
    const moved = this.reorder(index, targetIndex, true);

    if (moved) {
      this.reorderFeedback.announce(`Notschlafstelle ${moved.name}`, targetIndex, this.visibleShelters().length);
    }
  }

  /**
   * Both indices count the *displayed* shelters, which under an active filter are only some of them
   * - they are translated into the full list before the move, so a shelter filtered out of view
   * keeps its place instead of being reordered by a move it isn't part of. Moving past such a
   * shelter therefore jumps over it, which is exactly what the visible list shows afterwards.
   *
   * `keepFocusOnHandle` only for the keyboard path: after a drag the pointer, not the keyboard, is
   * where the user is, and pulling focus onto the handle there would be a focus ring out of nowhere.
   */
  private reorder(fromVisibleIndex: number, toVisibleIndex: number, keepFocusOnHandle: boolean): ShelterItem | undefined {
    const visible = this.visibleShelters();
    if (toVisibleIndex < 0 || toVisibleIndex >= visible.length) {
      return undefined;
    }

    const reordered = [...this._shelters()];
    const fromIndex = reordered.findIndex(shelter => shelter.id === visible[fromVisibleIndex].id);
    const toIndex = reordered.findIndex(shelter => shelter.id === visible[toVisibleIndex].id);

    moveItemInArray(reordered, fromIndex, toIndex);
    this._shelters.set(reordered); // optimistic, updates in the background
    // The handles are keyed by the position in the displayed list, not in the full one.
    if (keepFocusOnHandle) {
      this.reorderFeedback.refocusHandle(`dragShelterHandle-${toVisibleIndex}`);
    }

    this.shelterApiService.reorderShelters(reordered.map(shelter => shelter.id)).subscribe({
      next: data => {
        this._shelters.set(data.shelters);
        // The response replaces every record, so the focused handle is a new element by now.
        if (keepFocusOnHandle) {
          this.reorderFeedback.refocusHandle(`dragShelterHandle-${toVisibleIndex}`);
        }
      },
      error: () => {
        this.toastr.error('Fehler beim Ändern der Reihenfolge', 'Fehler');
        this.loadShelters();
      }
    });

    return reordered[toIndex];
  }

  protected onFilterChanged(filter: EnabledFilter) {
    this.enabledFilter.set(filter);
  }

}
