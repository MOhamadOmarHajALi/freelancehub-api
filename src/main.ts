import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({ origin: ['http://localhost:3001', 'http://127.0.0.1:3001'] });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true },
  }));
  app.useStaticAssets('uploads/public', { prefix: '/files' }); // الملفات العامة فقط
  const cfg = new DocumentBuilder()
    .setTitle('FreelanceHub API')
    .setDescription('منصة عمل حر: مشاريع، عروض، محفظة، وحجز مالي (Escrow)')
    .setVersion('1.0').addBearerAuth().build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, cfg), { swaggerOptions: { persistAuthorization: true } });
  await app.listen(3000);   // Swagger: http://localhost:3000/docs
}
bootstrap();
