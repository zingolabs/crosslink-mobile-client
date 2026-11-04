import type { SyncStatus } from '../../app/wallet/generated/SyncStatus';
import { SyncScanRangePriorityStatusEnum } from '../../app/wallet/enums';

export const mockSyncingStatus: SyncStatus = {
  scan_ranges: [
    {
      priority: SyncScanRangePriorityStatusEnum.Scanned,
      start_block: '2000000',
      end_block: '2500000',
    },
  ],
  sync_start_height: 2000000,
  session_blocks_scanned: 0,
  total_blocks_scanned: 0,
  total_blocks: 0,
  percentage_total_blocks_scanned: 100,
  session_sapling_outputs_scanned: 0,
  total_sapling_outputs_scanned: 0,
  session_orchard_outputs_scanned: 0,
  total_orchard_outputs_scanned: 0,
  session_ironwood_outputs_scanned: 0,
  total_ironwood_outputs_scanned: 0,
  percentage_total_outputs_scanned: 100,
  total_outputs_scanned: 0,
  total_outputs: 0,
};

export default mockSyncingStatus;
