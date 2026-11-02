import { SyncScanRangeStatusType } from './SyncScanRangeStatusType';

export type SyncStatusType = {
  scan_ranges?: SyncScanRangeStatusType[];
  sync_start_height?: number;
  session_blocks_scanned?: number;
  total_blocks_scanned?: number;
  percentage_session_blocks_scanned?: number;
  percentage_total_blocks_scanned?: number;
  session_sapling_outputs_scanned?: number;
  total_sapling_outputs_scanned?: number;
  session_orchard_outputs_scanned?: number;
  total_orchard_outputs_scanned?: number;
  percentage_session_outputs_scanned?: number;
  percentage_total_outputs_scanned?: number;
};
