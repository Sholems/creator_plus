/** Mirrors apps/api/src/community/community-roles.ts. UI hints only — the API enforces. */
export function isPlatformAdmin(roles?: string[] | null): boolean {
  return !!roles?.some((r) => r === 'super_admin' || r === 'admin');
}

export function isCommunityStaff(roles?: string[] | null): boolean {
  return isPlatformAdmin(roles) || !!roles?.includes('community_manager');
}
