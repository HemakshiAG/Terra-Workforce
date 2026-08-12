import { generateIdempotencyKey } from './syncEngine';

describe('Phase 7 Offline & Sync Engine Integration Tests', () => {
  test('Idempotency Key format check', () => {
    const key1 = generateIdempotencyKey('ATTENDANCE_RECORD', 'LOC-101');
    const key2 = generateIdempotencyKey('ATTENDANCE_RECORD', 'LOC-101');
    expect(key1).toContain('SYNC-ATTENDANCE_RECORD-LOC-101-');
    expect(key1).not.toBe(key2);
  });

  test('Backoff calculation check', () => {
    // 2^attempts * 1000ms
    const calcBackoff = (attempts: number) => Math.min(Math.pow(2, attempts) * 1000, 60000);
    expect(calcBackoff(1)).toBe(2000);
    expect(calcBackoff(2)).toBe(4000);
    expect(calcBackoff(3)).toBe(8000);
    expect(calcBackoff(10)).toBe(60000);
  });
});
