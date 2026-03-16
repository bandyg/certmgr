const mockError = jest.fn();
const mockInfo = jest.fn();
const mockWarn = jest.fn();

jest.mock('../src/utils/logger', () => ({
  getLogger: jest.fn(() => ({
    error: mockError,
    info: mockInfo,
    warn: mockWarn,
  })),
}));

import { errorHandler } from '../src/middleware/error';
import type { Request, Response, NextFunction } from 'express';

describe('Error Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      path: '/test',
      method: 'GET',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
    mockError.mockClear();
    mockInfo.mockClear();
    mockWarn.mockClear();
  });

  it('should handle errors and return 500', () => {
    const error = new Error('Test error message');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  it('should handle non-Error objects', () => {
    const error = 'String error';

    errorHandler(error as any, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        code: 'INTERNAL_ERROR',
      }),
    }));
  });

  it('should log the error', () => {
    const error = new Error('Test error');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockError).toHaveBeenCalled();
  });
});