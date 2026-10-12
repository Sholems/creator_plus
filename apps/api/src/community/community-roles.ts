/**
 * Who may run the community. Platform admins can do everything; a
 * `community_manager` (granted by an admin from /community/manage/team) can
 * author courses, events and challenges and moderate — but cannot manage the
 * team itself or anything outside the community.
 */
export const COMMUNITY_MANAGER_ROLE = 'community_manager';
export const PLATFORM_ADMIN_ROLES = ['super_admin', 'admin'] as const;
export const COMMUNITY_STAFF_ROLES = [...PLATFORM_ADMIN_ROLES, COMMUNITY_MANAGER_ROLE];

export function isCommunityStaff(roleNames: string[]): boolean {
  return roleNames.some((r) => (COMMUNITY_STAFF_ROLES as string[]).includes(r));
}
