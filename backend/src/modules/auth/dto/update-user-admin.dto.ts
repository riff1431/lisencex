import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../../common/enums/app.enums';

export class UpdateUserAdminDto {
  @IsOptional()
  @IsEnum(UserRole, { message: 'role must be a valid user role' })
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
