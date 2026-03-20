import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service'; // nếu muốn fetch full user

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private userService: UserService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
        });
    }

    async validate(payload: { sub: string; email: string; role?: string }) {
        const user = await this.userService.findById(payload.sub);
        if (!user) {
            throw new UnauthorizedException(
                'User not found or account disabled',
            );
        }
        return {
            id: user.id,
            email: user.email,
            role: user.role,
        };
    }
}
