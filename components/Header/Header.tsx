import {
  faBars,
  faArrowUp,
  faArrowDown,
  faFaucet,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  NetInfoType,
  TranslateType,
  SnackbarType,
  SelectServerEnum,
  RouteEnum,
  ScreenEnum,
} from '../../app/AppState';
import {
  useAppLoadedActions,
  useAppLoadedSettings,
  useAppLoadedWallet,
} from '../../app/context';
import ZecAmount from '../Components/ZecAmount';
import FadeText from '../Components/FadeText';
import simpleBiometrics from '../../app/simpleBiometrics';
import { RPCSyncStatusType } from '../../app/wallet/types/RPCSyncStatusType';
import { isEqual } from 'lodash';
import SettingsIcon from '../../assets/icons/settings.svg';
import { radiusPill, space, text, useTheme } from '../../app/theme';

type HeaderProps = {
  // general
  testID?: string;
  title: string;
  screenName: ScreenEnum;
  // side menu
  noDrawMenu?: boolean;
  toggleMenuDrawer?: () => void;
  closeScreen?: () => void;
  // balance
  noBalance?: boolean;
  // syncing icons
  noSyncingStatus?: boolean;
  // ufvk
  noUfvkIcon?: boolean;
  // privacy
  noPrivacy?: boolean;
  setPrivacyOption?: (value: boolean) => Promise<void>;
  addLastSnackbar?: (snackbar: SnackbarType) => void;
  // shielding
  setShieldingAmount?: (value: number) => void;
  setScrollToTop?: (value: boolean) => void;
  setScrollToBottom?: (value: boolean) => void;
  // seed screen - shared between AppLoading & AppLoadad - different contexts
  translate?: (key: string) => TranslateType;
  netInfo?: NetInfoType;
  privacy?: boolean;
};

const Header: React.FunctionComponent<HeaderProps> = ({
  toggleMenuDrawer,
  noBalance,
  noSyncingStatus,
  noDrawMenu,
  translate: translateProp,
  netInfo: netInfoProp,
  privacy: privacyProp,
  addLastSnackbar,
  screenName,
}) => {
  const navigation: any = useNavigation();
  const { translate: translateContext } = useAppLoadedActions();
  const {
    security,
    selectIndexerServer,
    privacy: privacyContext,
  } = useAppLoadedSettings();
  const {
    totalBalance,
    info,
    syncingStatus,
    netInfo: netInfoContext,
  } = useAppLoadedWallet();

  const translate = translateProp ?? translateContext;
  const netInfo = netInfoProp ?? netInfoContext;
  const privacy = privacyProp ?? privacyContext;

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const opacityValue = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const [percentageOutputsScanned, setPercentageOutputsScanned] =
    useState<number>(0);
  const [syncInProgress, setSyncInProgress] = useState<boolean>(true);

  useEffect(() => {
    const percentage: number =
      syncingStatus.percentage_total_outputs_scanned ||
      syncingStatus.percentage_total_blocks_scanned ||
      0;
    if (
      !syncingStatus ||
      isEqual(syncingStatus, {} as RPCSyncStatusType) ||
      (!!syncingStatus.scan_ranges && syncingStatus.scan_ranges.length === 0) ||
      percentage === 0
    ) {
      // if the App is waiting for the first fetching, let's put 0.
      setPercentageOutputsScanned(0);
      setSyncInProgress(true);
    } else {
      // avoiding 0.00 or 100%, minimum 0.01, maximun 99.99
      setPercentageOutputsScanned(
        percentage && percentage < 0.01
          ? 0.01
          : percentage && percentage > 99.99
            ? 99.99
            : Number(percentage?.toFixed(2).replace(/\.?0+$/, '')),
      );
      setSyncInProgress(
        !!syncingStatus.scan_ranges &&
          syncingStatus.scan_ranges.length > 0 &&
          percentage < 100,
      );
    }
  }, [
    syncingStatus,
    syncingStatus.percentage_total_outputs_scanned,
    syncingStatus.percentage_total_blocks_scanned,
    syncingStatus.scan_ranges,
  ]);

  useEffect(() => {
    // Inicializa la animación solo una vez
    if (!animationRef.current) {
      animationRef.current = Animated.loop(
        Animated.sequence([
          Animated.delay(2000),
          Animated.timing(opacityValue, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      );
    }

    if (!noSyncingStatus) {
      if (syncInProgress) {
        animationRef.current?.start();
      } else {
        animationRef.current?.stop();
        opacityValue.setValue(1);
      }
    } else {
      animationRef.current?.stop();
      opacityValue.setValue(1);
    }

    return () => {
      animationRef.current?.stop();
      opacityValue.setValue(1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncInProgress, noSyncingStatus]);

  const statusChip = {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginHorizontal: 2.5,
    padding: 1,
    minWidth: 25,
    minHeight: 25,
  };

  return (
    <>
      <View>
        <View
          testID="header"
          style={[
            styles.header,
            !noDrawMenu ? styles.headerTall : styles.headerShort,
            {
              backgroundColor: colors.bgCanvas,
              paddingTop: insets.top + 10,
            },
          ]}
        >
          {!noBalance && (
            <View style={styles.balanceRow}>
              <ZecAmount
                currencyName={info.currencyName}
                color={colors.fgDefault}
                size={36}
                amtZec={
                  totalBalance
                    ? totalBalance.totalOrchardBalance +
                      totalBalance.totalSaplingBalance +
                      totalBalance.totalTransparentBalance
                    : 0
                }
                privacy={privacy}
                smallPrefix={true}
              />
            </View>
          )}

          <View style={styles.progressArea}>
            {netInfo.isConnected && !(percentageOutputsScanned === 0) && (
              <>
                <View
                  style={[
                    styles.progressBar,
                    { backgroundColor: colors.bgSurface },
                  ]}
                />
                <View
                  style={[
                    styles.progressBar,
                    styles.progressFill,
                    { backgroundColor: colors.fgSuccess },
                  ]}
                />
              </>
            )}
            {netInfo.isConnected && percentageOutputsScanned === 0 && (
              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: colors.bgSyncing },
                ]}
              />
            )}
          </View>

          <View style={styles.statusRow}>
            {!noSyncingStatus &&
              selectIndexerServer !== SelectServerEnum.offline && (
                <View style={styles.statusChipRow}>
                  {netInfo.isConnected && !(percentageOutputsScanned === 0) ? (
                    <>
                      {!syncInProgress && (
                        <View style={statusChip}>
                          <View
                            testID="header.checkicon"
                            style={styles.statusChipInner}
                          >
                            <FadeText style={[text.caption2, styles.chipText]}>
                              {translate('synced') as string}
                            </FadeText>
                          </View>
                        </View>
                      )}
                      {syncInProgress && (
                        <View style={statusChip}>
                          <Animated.View
                            style={[
                              styles.statusChipInner,
                              { opacity: opacityValue },
                            ]}
                          >
                            <View style={styles.statusChipInner}>
                              <FadeText
                                style={[text.caption2, styles.chipText]}
                              >
                                {translate('syncing') as string}
                              </FadeText>
                              {percentageOutputsScanned > 0 && (
                                <>
                                  <FadeText
                                    style={[text.caption2, styles.chipText]}
                                  >
                                    {' - '}
                                  </FadeText>
                                  <FadeText
                                    style={[text.caption2, styles.chipText]}
                                  >
                                    {` ${percentageOutputsScanned}%`}
                                  </FadeText>
                                </>
                              )}
                            </View>
                          </Animated.View>
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      {netInfo.isConnected && (
                        <View style={statusChip}>
                          <TouchableOpacity
                            onPress={() => {
                              navigation.navigate(RouteEnum.SyncReport);
                            }}
                          >
                            <View
                              testID="header.wifiicon"
                              style={styles.statusChipInner}
                            >
                              <FadeText
                                style={[text.caption2, styles.chipText]}
                              >
                                {translate('connecting') as string}
                              </FadeText>
                            </View>
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}
            {selectIndexerServer === SelectServerEnum.offline && (
              <View
                style={[
                  styles.offlineChip,
                  { borderColor: colors.borderMuted },
                ]}
              >
                <View
                  testID="header.offlineicon"
                  style={styles.offlineChipInner}
                >
                  <FadeText style={[text.caption2, styles.chipText]}>
                    {translate('settings.server-offline') as string}
                  </FadeText>
                </View>
              </View>
            )}
          </View>

          <View style={styles.actionsRow}>
            <View style={styles.actionGroup}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  navigation.navigate(RouteEnum.Send);
                }}
              >
                <View
                  style={[
                    styles.actionDisc,
                    { backgroundColor: colors.bgSurface },
                  ]}
                >
                  <FontAwesomeIcon
                    size={30}
                    icon={faArrowUp}
                    color={colors.fgDefault}
                    style={styles.actionIconUp}
                  />
                </View>
                <FadeText>Send</FadeText>
              </TouchableOpacity>
            </View>

            <View style={styles.actionGroup}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  navigation.navigate(RouteEnum.Receive);
                }}
              >
                <View
                  style={[
                    styles.actionDisc,
                    { backgroundColor: colors.bgSurface },
                  ]}
                >
                  <FontAwesomeIcon
                    size={30}
                    icon={faArrowDown}
                    color={colors.fgDefault}
                    style={styles.actionIconDown}
                  />
                </View>
                <FadeText>Receive</FadeText>
              </TouchableOpacity>
            </View>

            <View style={styles.actionGroup}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  navigation.navigate(RouteEnum.Faucet);
                }}
              >
                <View
                  style={[
                    styles.actionDisc,
                    { backgroundColor: colors.bgSurface },
                  ]}
                >
                  <FontAwesomeIcon
                    size={30}
                    icon={faFaucet}
                    color={colors.fgDefault}
                  />
                </View>
                <FadeText>Faucet</FadeText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.menuButtonWrap, { top: insets.top }]}>
            <View style={styles.menuButtonRow}>
              {!noDrawMenu && (
                <TouchableOpacity
                  style={styles.menuButton}
                  testID="header.drawmenu"
                  accessible={true}
                  accessibilityLabel={translate('menudrawer-acc') as string}
                  onPress={toggleMenuDrawer}
                >
                  <FontAwesomeIcon
                    icon={faBars}
                    size={40}
                    color={colors.bgCanvas}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.settingsButtonWrap, { top: insets.top }]}>
          <TouchableOpacity
            style={styles.menuButton}
            testID="header.drawmenu"
            onPress={async () => {
              const resultBio = security.settingsScreen
                ? await simpleBiometrics({ translate })
                : true;

              if (resultBio === false) {
                if (addLastSnackbar) {
                  addLastSnackbar({
                    message: translate('biometrics-error') as string,
                    screenName: [screenName],
                  });
                }
                return;
              }

              // Go to the parent (InnerStack) and navigate there
              const parentNav = navigation.getParent();

              if (parentNav) {
                parentNav.navigate(RouteEnum.Settings);
              } else {
                // Fallback if for some reason there is no parent
                navigation.navigate(RouteEnum.Settings);
              }
            }}
          >
            <SettingsIcon width={35} height={35} color={colors.fgFaint} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    display: 'flex',
    alignItems: 'center',
    paddingBottom: 0,
  },
  headerTall: {
    minHeight: 60,
  },
  headerShort: {
    minHeight: 25,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 0,
  },
  progressArea: {
    display: 'flex',
    justifyContent: 'flex-start',
    width: '30%',
    height: 5,
    marginTop: 10,
  },
  progressBar: {
    height: 5,
    width: '100%',
    borderRadius: 3,
  },
  progressFill: {
    marginTop: -5,
  },
  statusRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 0,
    marginHorizontal: 5,
  },
  statusChipRow: {
    minHeight: 29,
    flexDirection: 'row',
  },
  statusChipInner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  chipText: {
    marginLeft: 2,
  },
  offlineChip: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2.5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderRadius: 10,
    minWidth: 25,
    minHeight: 25,
  },
  offlineChipInner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  actionsRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  actionGroup: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionDisc: {
    borderRadius: radiusPill,
    padding: space.xl,
    margin: 10,
  },
  actionIconUp: {
    transform: [{ rotate: '45deg' }],
  },
  actionIconDown: {
    transform: [{ rotate: '45deg' }],
  },
  menuButtonWrap: {
    padding: 11.5,
    position: 'absolute',
    left: 0,
  },
  menuButtonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 40,
  },
  menuButton: {
    marginRight: 5,
  },
  settingsButtonWrap: {
    padding: 13,
    position: 'absolute',
    right: 0,
  },
});

export default Header;
