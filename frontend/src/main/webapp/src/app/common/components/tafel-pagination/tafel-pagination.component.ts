import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'tafel-pagination',
  templateUrl: 'tafel-pagination.component.html'
})
export class TafelPaginationComponent {
  @Input() align: 'start' | 'center' | 'end' | '' = '';
  @Input() size?: 'sm' | 'lg';
  @Output() pageChanged = new EventEmitter<number>();

  pages: number[];
  maxPage: number;
  currentPage: number;

  @Input() set paginationData(paginationData: TafelPaginationData) {
    this.currentPage = paginationData.currentPage + 1;
    this.maxPage = paginationData.totalPages;
    this.pages = Array.from({length: paginationData.totalPages}, (value, key) => key + 1);
  }

  emitPageChange(pageIndex: number) {
    this.pageChanged.emit(pageIndex - 1);
  }

  protected readonly Math = Math;
}

export interface TafelPaginationData {
  currentPage: number;
  totalPages: number;
}
