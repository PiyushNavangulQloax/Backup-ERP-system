import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, IsIn } from 'class-validator';

export class CreateInspectionDto {
  @IsIn(['INCOMING_GRN', 'PRODUCTION_OUTPUT'], {
    message: 'sourceType must be either INCOMING_GRN or PRODUCTION_OUTPUT',
  })
  @IsNotEmpty()
  sourceType: 'INCOMING_GRN' | 'PRODUCTION_OUTPUT';

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsString()
  grnId?: string;

  @IsOptional()
  @IsString()
  grnItemId?: string;

  @IsOptional()
  @IsString()
  jobCardId?: string;

  @IsString()
  @IsNotEmpty()
  partId: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsNumber()
  @Min(0.0001, { message: 'inspectedQty must be greater than 0' })
  inspectedQty: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
