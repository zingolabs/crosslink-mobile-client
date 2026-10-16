/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { ContextAppLoading } from '../../context';
import Scanner from '../../../components/Scanner';
import { Header } from '../../../components/Header';

import { View } from 'react-native';
import Snackbars from '../../../components/Components/Snackbars';
import { ToastProvider } from 'react-native-toastier';
import { ScreenEnum } from '../../AppState';
import { useTheme } from '../../theme';

type ScannerUfvkProps = {
  setUfvkText: (k: string) => void;
  closeModal: () => void;
};
const ScannerUfvk: React.FunctionComponent<ScannerUfvkProps> = ({
  setUfvkText,
  closeModal,
}) => {
  const context = useContext(ContextAppLoading);
  const { translate, snackbars, removeFirstSnackbar } = context;
  const { colors } = useTheme();
  const screenName = ScreenEnum.ScannerUfvk;

  const onRead = async (scandata: string) => {
    if (!scandata) {
      return;
    }
    setUfvkText(scandata);
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgCanvas,
        }}
      >
        <Header
          title={translate('scanner.text') as string}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
          closeScreen={closeModal}
        />
        <Scanner onRead={onRead} onClose={() => closeModal()} active={true} />
      </View>
    </ToastProvider>
  );
};

export default ScannerUfvk;
