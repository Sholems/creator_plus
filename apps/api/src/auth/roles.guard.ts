import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { prisma } from '@creatorplus/database';
import { ROLES_KEY } from './roles.decorator';

/**
 * Checks that the authenticated user (populated by JwtAuthGuard) holds at least
 * one of the roles required via the @Roles decorator. Roles are resolved from
 * the user_roles table so role changes take effect without re-issuing tokens.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const userId = req.user?.sub;
    if (!userId) {
      throw new ForbiddenException('Not authenticated');
    }

    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      select: { role: { select: { name: true } } },
    });
    const roleNames = userRoles.map((ur) => ur.role.name);

    const allowed = required.some((r) => roleNames.includes(r));
    if (!allowed) {
      throw new ForbiddenException('Insufficient permissions');
    }

    req.user.roles = roleNames;
    return true;
  }
}
