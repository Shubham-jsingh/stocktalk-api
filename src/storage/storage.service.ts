import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage, Bucket } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import { extname } from 'path';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export interface UploadSignedUrlResult {
  uploadUrl: string;
  objectName: string;
  publicUrl: string;
  contentType: string;
  expiresInSeconds: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private storage?: Storage;
  private bucket?: Bucket;
  private bucketName?: string;

  constructor(private readonly config: ConfigService) {}

  private getBucket(): Bucket {
    if (this.bucket) {
      return this.bucket;
    }

    this.bucketName = this.config.get<string>('GCS_BUCKET_NAME', '');
    if (!this.bucketName) {
      throw new ServiceUnavailableException(
        'Image uploads are not configured (GCS_BUCKET_NAME is missing)',
      );
    }

    this.storage = new Storage();
    this.bucket = this.storage.bucket(this.bucketName);
    this.logger.log(`GCS client initialized for bucket "${this.bucketName}"`);
    return this.bucket;
  }

  async generateUploadSignedUrl(
    userId: string,
    fileName: string,
    contentType: string,
  ): Promise<UploadSignedUrlResult> {
    this.assertImageUpload(fileName, contentType);

    const extension = this.resolveExtension(fileName, contentType);
    const objectName = `uploads/${userId}/${randomUUID()}${extension}`;
    const expiresInSeconds = 15 * 60;

    const bucket = this.getBucket();
    const [uploadUrl] = await bucket.file(objectName).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + expiresInSeconds * 1000,
      contentType,
    });

    return {
      uploadUrl,
      objectName,
      publicUrl: `https://storage.googleapis.com/${this.bucketName}/${objectName}`,
      contentType,
      expiresInSeconds,
    };
  }

  private assertImageUpload(fileName: string, contentType: string): void {
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      throw new BadRequestException(
        'Only image uploads are allowed (jpeg, png, webp, gif)',
      );
    }

    const extension = extname(fileName).toLowerCase();
    const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

    if (extension && !allowedExtensions.has(extension)) {
      throw new BadRequestException('File name must use a supported image extension');
    }
  }

  private resolveExtension(fileName: string, contentType: string): string {
    const fromContentType = CONTENT_TYPE_EXTENSIONS[contentType];
    if (fromContentType) {
      return fromContentType;
    }

    const fromFileName = extname(fileName).toLowerCase();
    if (fromFileName === '.jpeg') {
      return '.jpg';
    }

    return fromFileName || '.jpg';
  }
}
