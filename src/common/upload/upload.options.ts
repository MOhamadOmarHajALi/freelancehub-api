import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { diskStorage } from 'multer';

const EXT: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf',
  'application/zip': '.zip', 'application/x-zip-compressed': '.zip',
};

export const IMAGES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_OR_PDF = ['image/jpeg', 'image/png', 'application/pdf'];
export const PDF_OR_ZIP = ['application/pdf', 'application/zip', 'application/x-zip-compressed'];

/** public => يُخدم من /files | private => يُنزَّل فقط عبر endpoint يتحقق من الصلاحية */
export const uploadOptions = (dir: 'public' | 'private', mimes: string[], maxMB: number) => ({
  storage: diskStorage({
    destination: (_r, _f, cb) => { const d = `uploads/${dir}`; fs.mkdirSync(d, { recursive: true }); cb(null, d); },
    filename: (_r, f, cb) => cb(null, randomUUID() + EXT[f.mimetype]),   // اسم عشوائي، لا نثق باسم المستخدم
  }),
  limits: { fileSize: maxMB * 1024 * 1024 },
  fileFilter: (_r: any, f: any, cb: any) =>
    mimes.includes(f.mimetype) ? cb(null, true) : cb(new BadRequestException('Invalid file type'), false),
});
