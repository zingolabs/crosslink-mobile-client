import { SyncScanRangePriorityStatusEnum } from '../enums/SyncScanRangePriorityStatusEnum';

export type SyncScanRangeStatusType = {
  priority: SyncScanRangePriorityStatusEnum;
  start_block: number;
  end_block: number;
};
