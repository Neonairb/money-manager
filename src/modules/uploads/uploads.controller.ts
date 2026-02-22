import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('uploads')
export class UploadsController {
  @Post('receipt')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'uploads/receipts',
        filename: (_, file, callback) => {
          const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(null, `receipt-${suffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadReceipt(@UploadedFile() file: { filename: string }) {
    return {
      success: true,
      data: { receiptUrl: `/uploads/receipts/${file.filename}` },
    };
  }
}
