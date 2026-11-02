import { SyncScanRangePriorityStatusEnum } from '../../app/wallet/enums';
import { SyncStatusType } from '../../app/wallet/types';

export const mockSyncingStatus: SyncStatusType = {} as SyncStatusType;

mockSyncingStatus.scan_ranges = [
  {
    priority: SyncScanRangePriorityStatusEnum.Scanned,
    start_block: 2000000,
    end_block: 2500000,
  },
];
mockSyncingStatus.sync_start_height = 2000000;
mockSyncingStatus.session_blocks_scanned = 0;
mockSyncingStatus.total_blocks_scanned = 0;
mockSyncingStatus.percentage_session_blocks_scanned = 0;
mockSyncingStatus.percentage_total_blocks_scanned = 100;
mockSyncingStatus.session_sapling_outputs_scanned = 0;
mockSyncingStatus.total_sapling_outputs_scanned = 0;
mockSyncingStatus.session_orchard_outputs_scanned = 0;
mockSyncingStatus.total_orchard_outputs_scanned = 0;
mockSyncingStatus.percentage_session_outputs_scanned = 0;
mockSyncingStatus.percentage_total_outputs_scanned = 100;

export default mockSyncingStatus;
