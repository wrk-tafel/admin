import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'tafel-pagination',
  templateUrl: 'tafel-pagination.component.html'
})
export class TafelPaginationComponent {
  @Input() align: 'start' | 'center' | 'end' | '' = '';
  @Input() size?: 'sm' | 'lg';
  @Output() pageChanged = new EventEmitter<number>();

  @Input() set paginationData(paginationData: TafelPaginationData) {
    this.currentPage = paginationData.currentPage + 1;
    this.maxPage = paginationData.totalPages;
    this.pages = Array.from({length: paginationData.totalPages}, (value, key) => key + 1);
  }

  pages: number[];
  maxPage: number;
  currentPage: number;

  selectFirstPage() {
    this.emitPageChange(1);
  }

  selectPreviousPage() {
    this.emitPageChange(Math.max(1, this.currentPage - 1));
  }

  selectPage(index: number) {
    this.emitPageChange(index + 1);
  }

  selectNextPage() {
    this.emitPageChange(Math.min(this.maxPage, this.currentPage + 1));
  }

  selectLastPage() {
    this.emitPageChange(this.maxPage);
  }

  private emitPageChange(pageIndex: number) {
    this.pageChanged.emit(pageIndex - 1);
  }

}

export interface TafelPaginationData {
  currentPage: number;
  totalPages: number;
}
