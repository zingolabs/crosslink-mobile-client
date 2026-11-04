import React from 'react';
import { useFeedback } from '../../store';
import Scanner from '../../../components/Scanner';
import { Header } from '../../../components/Header';

import { View, StyleSheet } from 'react-native';
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
  const { translate, removeFirstSnackbar } = useFeedback();
  const { snackbars } = useFeedback();
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

      <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});

export default ScannerUfvk;
