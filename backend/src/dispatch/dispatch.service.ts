import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DispatchService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { status?: string }) {
    const where: any = {};
    if (params?.status) where.status = params.status;

    return this.prisma.dispatch.findMany({
      where,
      include: {
        customer: true,
        invoice: true,
        transporter: true,
        deliveryChallan: true,
        gatePass: true,
        boxes: { include: { box: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: { id },
      include: {
        customer: true,
        invoice: { include: { items: { include: { part: true } } } },
        transporter: true,
        deliveryChallan: true,
        gatePass: true,
        boxes: {
          include: {
            box: {
              include: {
                items: { include: { part: { include: { unit: true } } } },
              },
            },
          },
        },
        createdBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!dispatch) throw new NotFoundException('Dispatch not found');
    return dispatch;
  }

  async create(userId: string, data: {
    invoiceId: string;
    transporterId?: string;
    vehicleNumber?: string;
    vehicleType?: string;
    driverName?: string;
    driverPhone?: string;
    driverLicense?: string;
    lrNumber?: string;
    movementType?: string;
    reasonForTransport?: string;
    referenceType?: string;
    referenceNumber?: string;
    ewayBillNumber?: string;
    sealRequired?: boolean;
    sealNumber?: string;
    specialInstructions?: string;
    boxIds: string[];
  }) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: data.invoiceId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (!data.boxIds || data.boxIds.length === 0) {
      throw new BadRequestException('At least one box must be assigned to dispatch');
    }

    // Ensure boxes are SEALED
    const boxes = await this.prisma.box.findMany({
      where: { id: { in: data.boxIds } },
    });

    for (const b of boxes) {
      if (b.status !== 'SEALED') {
        throw new BadRequestException(
          `Box ${b.boxNumber} is in '${b.status}' status. Only SEALED boxes can be dispatched`,
        );
      }
    }

    const count = await this.prisma.dispatch.count();
    const dispatchNumber = `DSP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.dispatch.create({
      data: {
        dispatchNumber,
        invoiceId: data.invoiceId,
        customerId: invoice.customerId,
        transporterId: data.transporterId,
        vehicleNumber: data.vehicleNumber,
        vehicleType: data.vehicleType || 'Covered Truck',
        driverName: data.driverName,
        driverPhone: data.driverPhone,
        driverLicense: data.driverLicense,
        lrNumber: data.lrNumber,
        movementType: data.movementType || 'Customer Delivery',
        reasonForTransport: data.reasonForTransport || 'Supply',
        referenceType: data.referenceType || 'Sales Order',
        referenceNumber: data.referenceNumber || `SO-${dispatchNumber.replace('DSP-', '')}`,
        ewayBillNumber: data.ewayBillNumber,
        sealRequired: data.sealRequired || false,
        sealNumber: data.sealNumber,
        specialInstructions: data.specialInstructions,
        status: 'PREPARED',
        createdById: userId,
        boxes: {
          create: data.boxIds.map((boxId) => ({
            boxId,
          })),
        },
      },
      include: {
        customer: true,
        invoice: true,
        boxes: { include: { box: true } },
      },
    });
  }

  async verifyBox(dispatchId: string, boxId: string, userId: string) {
    const dispatchBox = await this.prisma.dispatchBox.findFirst({
      where: { dispatchId, boxId },
      include: { box: true },
    });

    if (!dispatchBox) {
      throw new BadRequestException('Box is not part of this dispatch manifest');
    }

    return this.prisma.dispatchBox.update({
      where: { id: dispatchBox.id },
      data: {
        verifiedAt: new Date(),
        verifiedBy: userId,
      },
      include: { box: true },
    });
  }

  async unverifyBox(dispatchId: string, boxId: string) {
    const dispatch = await this.findOne(dispatchId);
    if (dispatch.status === 'DISPATCHED') {
      throw new BadRequestException('Cannot unverify boxes after gate-out is authorized');
    }

    const dispatchBox = await this.prisma.dispatchBox.findFirst({
      where: { dispatchId, boxId },
      include: { box: true },
    });

    if (!dispatchBox) {
      throw new BadRequestException('Box is not part of this dispatch manifest');
    }

    return this.prisma.dispatchBox.update({
      where: { id: dispatchBox.id },
      data: {
        verifiedAt: null,
        verifiedBy: null,
      },
      include: { box: true },
    });
  }


  async gateOut(id: string, userId: string) {
    const dispatch = await this.findOne(id);
    if (dispatch.status === 'DISPATCHED') {
      throw new BadRequestException('Dispatch is already completed');
    }

    // Check that all boxes have been scanned & verified
    const unverified = dispatch.boxes.some((b) => !b.verifiedAt);
    if (unverified) {
      throw new BadRequestException(
        'All boxes must be scanned and verified before authorizing gate-out',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update dispatch status
      const updated = await tx.dispatch.update({
        where: { id },
        data: {
          status: 'DISPATCHED',
          gateOutTime: new Date(),
        },
      });

      // 2. Mark all boxes as DISPATCHED & record stock deduction
      for (const dBox of dispatch.boxes) {
        await tx.box.update({
          where: { id: dBox.boxId },
          data: { status: 'DISPATCHED' },
        });

        // Deduct inventory items contained in the box
        for (const item of dBox.box.items) {
          const stock = await tx.stock.findFirst({
            where: { partId: item.partId },
          });

          if (stock && stock.quantityOnHand >= item.quantity) {
            await tx.stock.update({
              where: { id: stock.id },
              data: { quantityOnHand: stock.quantityOnHand - item.quantity },
            });

            await tx.stockMovement.create({
              data: {
                partId: item.partId,
                storeId: stock.storeId,
                movementType: 'DISPATCH',
                quantity: item.quantity,
                referenceType: 'DISPATCH',
                referenceId: dispatch.id,
                reason: `Dispatched via shipment #${dispatch.dispatchNumber}`,
                performedById: userId,
              },
            });
          }
        }
      }

      return updated;
    });
  }
}
