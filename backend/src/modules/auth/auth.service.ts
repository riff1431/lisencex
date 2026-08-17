import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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

  async findAllUsers(query?: { search?: string; role?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Number(query?.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query?.role) filter.role = query.role;
    if (query?.search) {
      filter.$or = [
        { email: { $regex: query.search, $options: 'i' } },
        { fullName: { $regex: query.search, $options: 'i' } },
        { envatoUsername: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-passwordHash -refreshTokenHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findUserDetail(userId: string) {
    const user = await this.userModel
      .findById(new Types.ObjectId(userId))
      .select('-passwordHash -refreshTokenHash')
      .lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUserRoleOrStatus(
    userId: string,
    dto: { role?: UserRole; isActive?: boolean },
    actor?: { actorId: string; actorRole: UserRole },
  ) {
    const user = await this.userModel.findById(new Types.ObjectId(userId));
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Privilege rules: only a SUPER_ADMIN may change roles or touch another
    // SUPER_ADMIN account — otherwise an ADMIN could promote itself and
    // collapse the role model.
    const actorIsSuperAdmin = actor?.actorRole === UserRole.SUPER_ADMIN;
    const targetIsSuperAdmin = user.role === UserRole.SUPER_ADMIN;
    if (dto.role !== undefined && !actorIsSuperAdmin) {
      throw new ForbiddenException('Only a super admin can change user roles');
    }
    if (targetIsSuperAdmin && !actorIsSuperAdmin) {
      throw new ForbiddenException('Only a super admin can modify a super admin account');
    }
    if (
      actor &&
      actor.actorId === user._id.toString() &&
      (dto.role !== undefined || dto.isActive === false)
    ) {
      throw new BadRequestException('Admins cannot change their own role or deactivate themselves');
    }

    if (dto.role) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    await user.save();
    return {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
    };
  }
}
