import { Test, TestingModule } from '@nestjs/testing';
import { BarcodesService } from './barcodes.service';
import { PrismaService } from '../database/prisma.service';

describe('BarcodesService', () => {
  let service: BarcodesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarcodesService,
        {
          provide: PrismaService,
          useValue: {
            barcode: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            barcodeScanHistory: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BarcodesService>(BarcodesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate barcode buffer for Code 128', async () => {
    const buffer = await service.generateBarcodeImage('PRT-TEST-001', 'code128');
    expect(buffer).toBeDefined();
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  it('should generate QR code data URL', async () => {
    const qrData = await service.generateQRCodeImage('BOX-2026-0001');
    expect(qrData).toBeDefined();
    expect(qrData.startsWith('data:image/png;base64,')).toBe(true);
  });
});
