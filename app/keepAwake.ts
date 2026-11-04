import {
  activateKeepAwake,
  deactivateKeepAwake,
} from '@sayem314/react-native-keep-awake';

export const keepAwake = (keep: boolean): void => {
  if (keep) {
    activateKeepAwake();
  } else {
    deactivateKeepAwake();
  }
};
