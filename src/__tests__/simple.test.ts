/**
 * Simple Test to Verify Jest Setup
 */

describe('Basic Math', () => {
  it('should add numbers correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('should multiply numbers correctly', () => {
    expect(2 * 3).toBe(6);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});

describe('String Operations', () => {
  it('should compare strings', () => {
    const str = 'hello world';
    expect(str).toContain('world');
  });

  it('should handle string length', () => {
    expect('test'.length).toBe(4);
  });
});

describe('Array Operations', () => {
  it('should filter arrays', () => {
    const arr = [1, 2, 3, 4, 5];
    const filtered = arr.filter((n) => n > 2);
    expect(filtered).toEqual([3, 4, 5]);
  });

  it('should map arrays', () => {
    const arr = [1, 2, 3];
    const mapped = arr.map((n) => n * 2);
    expect(mapped).toEqual([2, 4, 6]);
  });
});
