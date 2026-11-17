import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  // في تسجيل الدخول نحسب المحاولات لكل (IP + إيميل) حتى لا يُجرَّب حساب واحد آلاف المرات
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.originalUrl?.includes('/auth/login') ? `${req.ip}:${req.body?.email ?? ''}` : req.ip;
  }
}
