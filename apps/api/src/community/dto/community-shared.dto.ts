export type CommunityAccessLevelValue = 'FREE' | 'PREMIUM';

export interface CommunityPageInfo {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CommunityPage<T> {
  items: T[];
  pageInfo: CommunityPageInfo;
}

export interface CommunityAccessContext {
  userId: string;
  isAdmin: boolean;
  hasPremiumAccess: boolean;
}
