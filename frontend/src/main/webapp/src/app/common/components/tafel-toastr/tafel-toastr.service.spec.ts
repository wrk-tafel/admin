import {beforeEach, describe, expect, it, vi} from 'vitest';
import {TafelToastrService} from './tafel-toastr.service';

describe('TafelToastrService', () => {
  let service: TafelToastrService;
  let mockToastr: any;

  beforeEach(() => {
    mockToastr = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      options: {} // Empty container for the constructor to populate
    };

    service = new TafelToastrService(mockToastr);
  });

  it('should initialize default toastr options correctly', () => {
    expect(mockToastr.options.timeOut).toBe(5000);
    expect(mockToastr.options.progressBar).toBe(true);
  });

  it('should call toastr.success with the provided arguments', () => {
    service.success('Msg', 'Title');
    expect(mockToastr.success).toHaveBeenCalledWith('Msg', 'Title');
  });

});
