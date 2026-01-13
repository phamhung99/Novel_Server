// src/common/guards/roles.guard.ts
import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums/app.enum';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        // Lấy required roles từ metadata (method hoặc class)
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        // Nếu route không yêu cầu role nào → cho qua (hoặc bạn có thể throw nếu muốn strict)
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.role) {
            throw new ForbiddenException(
                'User not authenticated or no role assigned',
            );
        }

        // Kiểm tra user.role có nằm trong danh sách requiredRoles không
        const hasRole = requiredRoles.includes(user.role as UserRole);

        if (!hasRole) {
            throw new ForbiddenException(
                'You do not have permission to access this resource',
            );
        }

        return true;
    }
}
