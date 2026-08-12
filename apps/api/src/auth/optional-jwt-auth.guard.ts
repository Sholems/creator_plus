import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional authentication: attaches the validated JWT payload to `req.user`
 * when a valid Bearer token is present, but never rejects the request.
 * Use on public routes that expose slightly richer data to signed-in users
 * (e.g. a creator viewing their own product list sees DRAFT statuses).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    return user || null;
  }
}
