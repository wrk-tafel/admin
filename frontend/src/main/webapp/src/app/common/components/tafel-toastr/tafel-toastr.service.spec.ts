import {beforeEach, describe, expect, it, vi} from 'vitest';
import * as toastr from 'toastr';
import {TafelToastrService} from './tafel-toastr.service';

// Mock the functions and the options object
// By defining it this way, we return a mutable structure that the
// service constructor can populate without needing reassignment.
vi.mock('toastr', () => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  options: {}
}));

describe('TafelToastrService', () => {
  let service: TafelToastrService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset options properties individually rather than reassigning the whole object
    // This complies with the immutability rules of the import.
    toastr.options.timeOut = 0;
    toastr.options.closeButton = false;
    toastr.options.progressBar = false;
    toastr.options.positionClass = '';

    service = new TafelToastrService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize default toastr options correctly in constructor', () => {
    expect(toastr.options.timeOut).toBe(5000);
    expect(toastr.options.closeButton).toBe(true);
    expect(toastr.options.preventDuplicates).toBe(true);
    expect(toastr.options.tapToDismiss).toBe(true);
    expect(toastr.options.progressBar).toBe(true);
    expect(toastr.options.positionClass).toBe('toast-top-right');
  });

  it('should call toastr.success with the provided message and title', () => {
    service.success('Success message', 'Title');
    expect(toastr.success).toHaveBeenCalledWith('Success message', 'Title');
  });

  it('should call toastr.error with the provided message and title', () => {
    service.error('Error message', 'Error Title');
    expect(toastr.error).toHaveBeenCalledWith('Error message', 'Error Title');
  });

  it('should call toastr.info with the provided message and title', () => {
    service.info('Info message', 'Info Title');
    expect(toastr.info).toHaveBeenCalledWith('Info message', 'Info Title');
  });

  it('should call toastr.warning with the provided message and title', () => {
    service.warning('Warning message', 'Warning Title');
    expect(toastr.warning).toHaveBeenCalledWith('Warning message', 'Warning Title');
  });

  it('should handle missing titles gracefully', () => {
    service.success('Only message');
    expect(toastr.success).toHaveBeenCalledWith('Only message', undefined);
  });

});
