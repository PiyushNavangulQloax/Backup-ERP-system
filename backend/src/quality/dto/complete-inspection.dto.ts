import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CompleteInspectionDto {
  @IsNumber()
  @Min(0, { message: 'acceptedQty cannot be negative' })
  acceptedQty: number;

  @IsNumber()
  @Min(0, { message: 'rejectedQty cannot be negative' })
  rejectedQty: number;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
