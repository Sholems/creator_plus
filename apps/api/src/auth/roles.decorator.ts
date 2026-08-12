import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route/controller to users holding at least one of the given roles.
 * Enforced by RolesGuard, which resolves the caller's roles from the database.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
