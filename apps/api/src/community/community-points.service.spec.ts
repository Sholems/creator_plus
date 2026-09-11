import { levelFor, nextLevelAt, POINTS } from './community-points.service';

describe('community points', () => {
  it('derives levels from points', () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(4)).toBe(1);
    expect(levelFor(5)).toBe(2);
    expect(levelFor(20)).toBe(3);
    expect(levelFor(1_000_000)).toBe(9);
  });

  it('reports the next level threshold', () => {
    expect(nextLevelAt(0)).toBe(5);
    expect(nextLevelAt(5)).toBe(20);
    expect(nextLevelAt(1_000_000)).toBeNull();
  });

  it('has sane per-action point values', () => {
    expect(POINTS.POST).toBeGreaterThan(POINTS.COMMENT);
    expect(POINTS.LIKE_RECEIVED).toBeGreaterThan(0);
  });
});
