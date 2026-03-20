import { Injectable } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidV4 } from 'uuid';

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private readonly userService: UserService,
    ) {}

    async login(loginDto: LoginDto) {
        const user = await this.userService.findByEmailForLogin(loginDto.email);
        const isPasswordValid = await bcrypt.compare(
            loginDto.password,
            user.password,
        );

        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }

        const payload = { email: user.email, sub: user.id };
        return {
            accessToken: this.jwtService.sign(payload),
            user: { id: user.id, email: user.email, role: user.role },
        };
    }

    async register(registerDto: any) {
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);

        const id = uuidV4();

        const user = await this.userService.create({
            id,
            ...registerDto,
            password: hashedPassword,
        });

        const payload = { email: user.email, sub: user.id };
        return {
            accessToken: this.jwtService.sign(payload),
            user: { id: user.id, email: user.email },
        };
    }
}
