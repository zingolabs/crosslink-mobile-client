/**
 * Web stub for react-native-keychain. Behaves as a device with no biometrics
 * and nothing stored, which is the state most stories want.
 */
export const ACCESSIBLE = {
  WHEN_UNLOCKED: 'AccessibleWhenUnlocked',
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
} as const;

export const ACCESS_CONTROL = {
  BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE:
    'BiometryCurrentSetOrDevicePasscode',
  DEVICE_PASSCODE: 'DevicePasscode',
} as const;

export const SECURITY_LEVEL = {
  SECURE_HARDWARE: 'SECURE_HARDWARE',
  SECURE_SOFTWARE: 'SECURE_SOFTWARE',
} as const;

export const STORAGE_TYPE = { RSA: 'RSA', AES_GCM_NO_AUTH: 'AES_GCM_NO_AUTH' } as const;

export const BIOMETRY_TYPE = {
  TOUCH_ID: 'TouchID',
  FACE_ID: 'FaceID',
  FINGERPRINT: 'Fingerprint',
} as const;

export const getSupportedBiometryType = async () => null;
export const hasGenericPassword = async () => false;
export const getGenericPassword = async () => false;
export const setGenericPassword = async () => false;
export const resetGenericPassword = async () => true;
export const getSecurityLevel = async () => SECURITY_LEVEL.SECURE_SOFTWARE;

export default {
  ACCESSIBLE,
  ACCESS_CONTROL,
  SECURITY_LEVEL,
  STORAGE_TYPE,
  BIOMETRY_TYPE,
  getSupportedBiometryType,
  hasGenericPassword,
  getGenericPassword,
  setGenericPassword,
  resetGenericPassword,
  getSecurityLevel,
};
