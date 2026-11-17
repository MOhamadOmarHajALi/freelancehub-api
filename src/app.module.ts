import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ProjectsModule } from './projects/projects.module';
import { ProposalsModule } from './proposals/proposals.module';
import { WalletModule } from './wallet/wallet.module';
import { ContractsModule } from './contracts/contracts.module';

@Module({
  imports: [PrismaModule, CommonModule, AuthModule, UsersModule, CategoriesModule,
    ProjectsModule, ProposalsModule, WalletModule, ContractsModule],
})
export class AppModule {}
