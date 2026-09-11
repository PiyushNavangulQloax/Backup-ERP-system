import { Module } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { ChallanService } from './challan.service';
import { GatePassService } from './gate-pass.service';
import { DispatchController } from './dispatch.controller';

@Module({
  controllers: [DispatchController],
  providers: [DispatchService, ChallanService, GatePassService],
  exports: [DispatchService, ChallanService, GatePassService],
})
export class DispatchModule {}
