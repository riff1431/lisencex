import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { UserRole } from '../../common/enums/app.enums';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  private async generateTokens(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '1h' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ]);

    // Store hashed refresh token
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.userModel.updateOne(
      { _id: user._id },
      { refreshTokenHash, lastLoginAt: new Date() },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        envatoUsername: user.envatoUsername,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existing = await this.userModel.findOne({
      email: registerDto.email.toLowerCase().trim(),
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    const user = await this.userModel.create({
      fullName: registerDto.fullName.trim(),
      email: registerDto.email.toLowerCase().trim(),
      passwordHash,
      role: UserRole.CUSTOMER,
      isActive: true,
      ...(registerDto.envatoUsername
        ? { envatoUsername: registerDto.envatoUsername.trim() }
        : {}),
    });

    return this.generateTokens(user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.userModel.findOne({
      email: loginDto.email.toLowerCase().trim(),
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateTokens(user);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);
      const user = await this.userModel.findById(payload.sub);

      if (!user || !user.refreshTokenHash || !user.isActive) {
        throw new UnauthorizedException('Access denied or invalid session');
      }

      const isMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Expired or invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.userModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      { $unset: { refreshTokenHash: 1 } },
    );
    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(new Types.ObjectId(userId))
      .select('-passwordHash -refreshTokenHash');

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      envatoUsername: user.envatoUsername,
      lastLoginAt: user.lastLoginAt,
      createdAt: (user as any).createdAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userModel.findById(new Types.ObjectId(userId));
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email.toLowerCase().trim() !== user.email) {
      const existing = await this.userModel.findOne({
        email: dto.email.toLowerCase().trim(),
        _id: { $ne: user._id },
      });
      if (existing) {
        throw new ConflictException('Email is already in use by another account');
      }
      user.email = dto.email.toLowerCase().trim();
    }

    if (dto.fullName) {
      user.fullName = dto.fullName.trim();
    }

    if (dto.envatoUsername !== undefined) {
      user.envatoUsername = dto.envatoUsername ? dto.envatoUsername.trim() : undefined;
    }

    await user.save();

    return {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      envatoUsername: user.envatoUsername,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userModel.findById(new Types.ObjectId(userId));
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Incorrect current password');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.refreshTokenHash = undefined;
    await user.save();

    return { message: 'Password updated successfully. Please sign in again.' };
  }
}
