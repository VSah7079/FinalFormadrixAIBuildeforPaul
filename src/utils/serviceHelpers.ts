import { ServiceResult } from '../types/service';

export const createSuccess = <T>(data: T): ServiceResult<T> => ({
  success: true,
  data,
});

export const createError = <T>(error: string): ServiceResult<T> => ({
  success: false,
  error,
});
