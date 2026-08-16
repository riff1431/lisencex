import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.authService.findAllUsers(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.authService.findUserDetail(id);
  }

  @Patch(':id')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { role?: UserRole; isActive?: boolean },
  ) {
    return this.authService.updateUserRoleOrStatus(id, body);
  }
}
