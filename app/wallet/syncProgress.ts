import isEqual from 'lodash/isEqual';
import type { SyncStatus } from './generated/SyncStatus';

export type SyncProgress = { percentage: number; inProgress: boolean };

export const syncProgress = (syncingStatus: SyncStatus): SyncProgress => {
  const raw: number =
    syncingStatus?.percentage_total_outputs_scanned ||
    syncingStatus?.percentage_total_blocks_scanned ||
    0;
  if (
    !syncingStatus ||
    isEqual(syncingStatus, {} as SyncStatus) ||
    (!!syncingStatus.scan_ranges && syncingStatus.scan_ranges.length === 0) ||
    raw === 0
  ) {
    return { percentage: 0, inProgress: true };
  }
  const percentage =
    raw < 0.01
      ? 0.01
      : raw > 99.99
        ? 99.99
        : Number(raw.toFixed(2).replace(/\.?0+$/, ''));
  return {
    percentage,
    inProgress:
      !!syncingStatus.scan_ranges &&
      syncingStatus.scan_ranges.length > 0 &&
      raw < 100,
  };
};
