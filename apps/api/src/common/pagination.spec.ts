import { paginate, pageMeta, MAX_PER_PAGE, DEFAULT_PER_PAGE } from './pagination';

describe('pagination', () => {
  describe('paginate', () => {
    it('defaults page to 1 and perPage to the default', () => {
      expect(paginate()).toEqual({
        page: 1,
        perPage: DEFAULT_PER_PAGE,
        skip: 0,
        take: DEFAULT_PER_PAGE,
      });
    });

    it('computes skip from page and perPage', () => {
      expect(paginate(3, 25)).toEqual({ page: 3, perPage: 25, skip: 50, take: 25 });
    });

    it('caps perPage at MAX_PER_PAGE (DoS guard)', () => {
      expect(paginate(1, 1_000_000).perPage).toBe(MAX_PER_PAGE);
    });

    it('floors page/perPage to at least 1', () => {
      expect(paginate(0, 0)).toMatchObject({ page: 1, perPage: 1 });
      expect(paginate(-5, -5)).toMatchObject({ page: 1, perPage: 1 });
    });

    it('ignores non-finite input', () => {
      expect(paginate(NaN, NaN)).toMatchObject({ page: 1, perPage: DEFAULT_PER_PAGE });
    });
  });

  describe('pageMeta', () => {
    it('computes totalPages by ceiling', () => {
      expect(pageMeta(1, 20, 45)).toEqual({ page: 1, perPage: 20, total: 45, totalPages: 3 });
      expect(pageMeta(1, 20, 0)).toEqual({ page: 1, perPage: 20, total: 0, totalPages: 0 });
    });
  });
});
