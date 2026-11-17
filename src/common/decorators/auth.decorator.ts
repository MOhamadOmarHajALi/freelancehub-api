import { applyDecorators, createParamDecorator, ExecutionContext, SetMetadata, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RolesGuard } from '../guards/roles.guard';

export interface JwtUser { id: number; role: Role; sid: string; }

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

/** @Auth() = تسجيل دخول فقط | @Auth('OWNER') = تسجيل دخول + دور محدد */
export const Auth = (...roles: Role[]) =>
  applyDecorators(Roles(...roles), UseGuards(AuthGuard('jwt'), RolesGuard), ApiBearerAuth());

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtUser => ctx.switchToHttp().getRequest().user,
);
