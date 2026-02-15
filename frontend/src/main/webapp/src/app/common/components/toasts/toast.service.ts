import {Injectable, Signal, WritableSignal, signal} from '@angular/core';

export interface ToastOptionsWithId extends ToastOptions {
  id: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly _toastQueue: WritableSignal<ToastOptionsWithId[]> = signal([]);
  private nextId = 0;

  getToastQueue(): Signal<ToastOptionsWithId[]> {
    return this._toastQueue.asReadonly();
  }

  showToast(options: ToastOptions) {
    const toastWithId: ToastOptionsWithId = {
      ...options,
      id: this.nextId++
    };
    this._toastQueue.update(queue => [...queue, toastWithId]);
  }

  removeToast(id: number) {
    this._toastQueue.update(queue => queue.filter(toast => toast.id !== id));
  }

}

export enum ToastType {
  ERROR, INFO, SUCCESS, WARN
}

export interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
}
