export const NetInfoStateType = {
  unknown: 'unknown',
  none: 'none',
  cellular: 'cellular',
  wifi: 'wifi',
  bluetooth: 'bluetooth',
  ethernet: 'ethernet',
  wimax: 'wimax',
  vpn: 'vpn',
  other: 'other',
};

const state = {
  isConnected: true,
  type: NetInfoStateType.wifi,
  isInternetReachable: true,
  details: { isConnectionExpensive: false },
};

export const fetch = async () => state;
export const addEventListener = () => () => {};
export const useNetInfo = () => state;

export default { fetch, addEventListener, useNetInfo, NetInfoStateType };
