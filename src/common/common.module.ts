import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './guards/throttler.guard';

// الكاش (ذاكرة السيرفر، ساعة واحدة) + Throttler عام (300 طلب/دقيقة لكل IP)
@Global()
@Module({
  imports: [
    CacheModule.register({ isGlobal: true, ttl: 3_600_000 }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
  ],
  providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class CommonModule {}
