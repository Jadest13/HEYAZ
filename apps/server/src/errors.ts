export class ApiError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 429 | 503,
    public code: string,
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}
export function conflict(actual: number, expected: number) {
  if (actual !== expected)
    throw new ApiError(
      409,
      'REVISION_CONFLICT',
      '데이터가 변경되었습니다. 최신 데이터를 다시 조회해주세요.',
    );
}
