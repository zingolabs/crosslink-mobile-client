import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  ActivityIndicator,
} from 'react-native';

import { LoadedAppStackParamList } from '../../app/types';
import DetailLine from '../Components/DetailLine';
import {
  useAppLoadedActions,
  useAppLoadedSettings,
  useAppLoadedWallet,
  useAppLoadedUi,
} from '../../app/context';
import moment from 'moment';

import { Header } from '../Header';
import { NetInfoStateType } from '@react-native-community/netinfo/src/index';
import RegText from '../Components/RegText';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCloudDownload } from '@fortawesome/free-solid-svg-icons';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { isEqual } from 'lodash';
import { RPCSyncStatusType } from '../../app/rpc/types/RPCSyncStatusType';
import { RPCSyncScanRangeStatusType } from '../../app/rpc/types/RPCSyncScanRangeStatusType';
import { RPCSyncScanRangePriorityStatusEnum } from '../../app/rpc/enums/RPCSyncScanRangePriorityStatusEnum';
import { RouteEnum, ScreenEnum } from '../../app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createAlert } from '../../app/createAlert';
import { sendEmail } from '../../app/sendEmail';
import Utils from '../../app/utils';
import LiquidPrimaryButton from '../Components/LiquidButton/LiquidPrimaryButton';
import { space, useTheme } from '../../app/theme';

type SyncReportProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.SyncReport
>;

/**
 * The semantic color of one scan range in the progress map.
 */
const rangeColor = (
  priority: RPCSyncScanRangePriorityStatusEnum,
  tokenColors: ReturnType<typeof useTheme>['colors'],
): string => {
  switch (priority) {
    case RPCSyncScanRangePriorityStatusEnum.Scanning:
      return tokenColors.fgSyncing;
    case RPCSyncScanRangePriorityStatusEnum.Scanned:
    case RPCSyncScanRangePriorityStatusEnum.ScannedWithoutMapping:
      return tokenColors.fgSuccess;
    case RPCSyncScanRangePriorityStatusEnum.Historic:
      return tokenColors.fgSubtle;
    case RPCSyncScanRangePriorityStatusEnum.OpenAdjacent:
    case RPCSyncScanRangePriorityStatusEnum.FoundNote:
    case RPCSyncScanRangePriorityStatusEnum.ChainTip:
    case RPCSyncScanRangePriorityStatusEnum.Verify:
      return tokenColors.fgAccent;
    default:
      return tokenColors.fgDanger;
  }
};

const SyncReport: React.FunctionComponent<SyncReportProps> = ({
  navigation,
}) => {
  const {
    translate,
    removeFirstSnackbar,
    setBackgroundError,
    addLastSnackbar,
  } = useAppLoadedActions();
  const { wallet, language, zingolibVersion } = useAppLoadedSettings();
  const { syncingStatus, background, netInfo, info } = useAppLoadedWallet();
  const { snackbars } = useAppLoadedUi();
  const { colors } = useTheme();
  const { clear } = useToast();
  const screenName = ScreenEnum.SyncReport;

  const [maxBlocks, setMaxBlocks] = useState<number>(0);
  const [points, setPoints] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [serverServer, setServerServer] = useState<number>(0);
  const [serverWallet, setServerWallet] = useState<number>(0);
  const [server1Percent, setServer1Percent] = useState<number>(0);
  const [server2Percent, setServer2Percent] = useState<number>(0);
  const [server3Percent, setServer3Percent] = useState<number>(0);

  const [percentageOutputsScanned, setPercentageOutputsScanned] =
    useState<number>(0);
  const [syncInProgress, setSyncInProgress] = useState<boolean>(true);

  useEffect(() => {
    Utils.setMomentLocale(language);
  }, [language]);

  useEffect(() => {
    if (info.latestBlock) {
      (async () => {
        const a = [
          0, 500000, 1000000, 1500000, 2000000, 2500000, 3000000, 3500000,
          4000000, 4500000, 5000000, 5500000, 6000000, 6500000, 7000000,
          7500000, 8000000, 8500000, 9000000, 9500000, 10000000,
        ];
        const l = [
          '0',
          '500K',
          '1M',
          '1.5M',
          '2M',
          '2.5M',
          '3M',
          '3.5M',
          '4M',
          '4.5M',
          '5M',
          '5.5M',
          '6M',
          '6.5M',
          '7M',
          '7.5M',
          '8M',
          '8.5M',
          '9M',
          '9.5M',
          '10M',
        ];
        for (let i = 0; i < a.length; i++) {
          if (info.latestBlock < a[i]) {
            setMaxBlocks(a[i]);
            setPoints(a.slice(0, i));
            setLabels(l.slice(0, i + 1));
            break;
          }
        }
      })();
    }
  }, [info.latestBlock]);

  useEffect(() => {
    if (
      !syncingStatus ||
      isEqual(syncingStatus, {} as RPCSyncStatusType) ||
      (!!syncingStatus.scan_ranges && syncingStatus.scan_ranges.length === 0) ||
      syncingStatus.percentage_total_outputs_scanned === 0
    ) {
      // if the App is waiting for the first fetching, let's put 0.
      setPercentageOutputsScanned(0);
      setSyncInProgress(true);
    } else {
      setPercentageOutputsScanned(
        syncingStatus.percentage_total_outputs_scanned &&
          syncingStatus.percentage_total_outputs_scanned < 0.01
          ? 0.01
          : Number(
              syncingStatus.percentage_total_outputs_scanned
                ?.toFixed(2)
                .replace(/\.?0+$/, ''),
            ),
      );
      setSyncInProgress(
        !!syncingStatus.scan_ranges &&
          syncingStatus.scan_ranges.length > 0 &&
          !!syncingStatus.percentage_total_outputs_scanned &&
          syncingStatus.percentage_total_outputs_scanned < 100,
      );
    }
  }, [
    syncingStatus,
    syncingStatus.percentage_total_outputs_scanned,
    syncingStatus.scan_ranges,
  ]);

  useEffect(() => {
    /*
    SERVER points:
    - server0 : first block of the server -> 0
    - server1 : wallet's birthday
    - server2 : server last block
    - server3 : empty part of the server bar
    */

    const serv1: number = wallet.birthday || 0;
    const serv2: number =
      info.latestBlock && wallet.birthday
        ? info.latestBlock - wallet.birthday
        : 0;
    const serv3: number = maxBlocks ? maxBlocks - serv1 - serv2 : 0;
    const serv1Percent: number = (serv1 * 100) / maxBlocks;
    const serv2Percent: number = (serv2 * 100) / maxBlocks;
    const serv3Percent: number = (serv3 * 100) / maxBlocks;

    /*
      serverServer : blocks of the server
      serverWallet : blocks of the wallet
    */

    const servServer: number = info.latestBlock || 0;
    const servWallet: number =
      info.latestBlock && wallet.birthday
        ? info.latestBlock - wallet.birthday
        : 0;

    setServerServer(servServer);
    setServerWallet(servWallet);
    setServer1Percent(serv1Percent);
    setServer2Percent(serv2Percent);
    setServer3Percent(serv3Percent);
  }, [maxBlocks, info.latestBlock, wallet.birthday]);

  const reportError = (error: string) => {
    createAlert(
      setBackgroundError,
      addLastSnackbar,
      [screenName],
      'Background Sync Error',
      error,
      false,
      translate,
      sendEmail,
      zingolibVersion,
    );
  };

  //console.log('render sync report. background:', background);

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
        <Header
          title={translate('report.title') as string}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
          closeScreen={() => {
            clear();
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
        />
        <ScrollView
          testID="syncreport.scroll-view"
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {(!netInfo.isConnected ||
            netInfo.type === NetInfoStateType.cellular ||
            netInfo.isConnectionExpensive) && (
            <View style={styles.netStatusRow}>
              <DetailLine
                label={translate('report.networkstatus') as string}
                screenName={screenName}
              >
                <View style={styles.netStatusCol}>
                  {!netInfo.isConnected && (
                    <RegText color={colors.fgDanger}>
                      {' '}
                      {translate('report.nointernet') as string}{' '}
                    </RegText>
                  )}
                  {netInfo.type === NetInfoStateType.cellular && (
                    <RegText color={colors.fgWarning}>
                      {' '}
                      {translate('report.cellulardata') as string}{' '}
                    </RegText>
                  )}
                  {netInfo.isConnectionExpensive && (
                    <RegText color={colors.fgWarning}>
                      {' '}
                      {translate('report.connectionexpensive') as string}{' '}
                    </RegText>
                  )}
                </View>
              </DetailLine>
              <FontAwesomeIcon
                icon={faCloudDownload}
                color={
                  !netInfo.isConnected ? colors.fgDanger : colors.fgWarning
                }
                size={20}
                style={styles.netStatusIcon}
              />
            </View>
          )}
          {!!maxBlocks && netInfo.isConnected ? (
            <>
              <View style={styles.syncSection}>
                <DetailLine
                  label={translate('report.syncstatus') as string}
                  value={
                    syncInProgress
                      ? (translate('report.running') as string) +
                        ` ${percentageOutputsScanned > 0 ? percentageOutputsScanned + '%' : ''}`
                      : (translate('report.finished') as string)
                  }
                  screenName={screenName}
                />

                <View
                  style={[
                    styles.separator,
                    { backgroundColor: colors.borderFaint },
                  ]}
                />

                {!!maxBlocks && serverServer > 0 && serverWallet > 0 && (
                  <>
                    <View style={styles.tickLabels}>
                      {labels.map((label: string) => (
                        <Text key={label} style={{ color: colors.fgAccent }}>
                          {label}
                        </Text>
                      ))}
                    </View>
                    <View style={styles.tickRow}>
                      {points.map((point: number) => (
                        <View
                          key={point}
                          style={[
                            styles.tick,
                            {
                              borderRightColor: colors.borderAccent,
                              borderLeftColor: colors.borderAccent,
                              width: `${(points[1] * 100) / maxBlocks}%`,
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <View
                      style={[
                        styles.serverBar,
                        { borderBottomColor: colors.borderAccent },
                      ]}
                    >
                      {server1Percent >= 0 && (
                        <View
                          style={[
                            styles.barSegment,
                            styles.barSegmentStart,
                            server1Percent > 0 ? styles.barSegmentEdge : null,
                            {
                              backgroundColor: colors.bgAccent,
                              borderLeftColor: colors.borderAccent,
                              borderRightColor: colors.bgAccent,
                              width: `${server1Percent}%`,
                            },
                          ]}
                        />
                      )}
                      {server2Percent >= 0 && (
                        <View
                          style={[
                            styles.barSegment,
                            server2Percent > 0 ? styles.barSegmentEdge : null,
                            styles.barSegmentUnderline,
                            {
                              backgroundColor: colors.bgSyncing,
                              borderRightColor: colors.bgSyncing,
                              width: `${server2Percent}%`,
                              borderBottomColor: colors.bgAccent,
                            },
                          ]}
                        />
                      )}
                      {server3Percent >= 0 && (
                        <View
                          style={[
                            styles.barSegment,
                            styles.barSegmentEdge,
                            {
                              backgroundColor: colors.bgFaint,
                              borderRightColor: colors.borderAccent,
                              width: `${server3Percent}%`,
                            },
                          ]}
                        />
                      )}
                    </View>
                    {serverServer > 0 && (
                      <View style={styles.legendRow}>
                        <Text style={{ color: colors.fgAccent }}>
                          {translate('report.server-title') as string}
                        </Text>
                        <View
                          style={[
                            styles.legendSwatch,
                            { backgroundColor: colors.bgAccent },
                          ]}
                        />
                        <Text style={{ color: colors.fgDefault }}>
                          {serverServer +
                            (translate('report.blocks') as string)}
                        </Text>
                      </View>
                    )}
                    {serverWallet > 0 && (
                      <View style={styles.legendRow}>
                        <Text style={{ color: colors.fgAccent }}>
                          {translate('report.wallet') as string}
                        </Text>
                        <View
                          style={[
                            styles.legendSwatch,
                            { backgroundColor: colors.bgSyncing },
                          ]}
                        />
                        <Text
                          testID="syncreport.wallettotalblocks"
                          style={{ color: colors.fgDefault }}
                        >
                          {serverWallet +
                            (translate('report.blocks') as string)}
                        </Text>
                      </View>
                    )}

                    <View
                      style={[
                        styles.separator,
                        { backgroundColor: colors.borderFaint },
                      ]}
                    />
                  </>
                )}

                {!!maxBlocks && percentageOutputsScanned > 0 && (
                  <>
                    <DetailLine
                      label={translate('report.map') as string}
                      screenName={screenName}
                    >
                      <View style={styles.mapBoundsRow}>
                        <>
                          <Text style={{ color: colors.fgDefault }}>
                            {wallet.birthday}
                          </Text>
                          <Text style={{ color: colors.fgDefault }}>
                            {info.latestBlock}
                          </Text>
                        </>
                      </View>
                      <View style={styles.mapBoundsTicks}>
                        <>
                          <View
                            style={[
                              styles.boundTick,
                              { borderLeftColor: colors.borderAccent },
                            ]}
                          />
                          <View
                            style={[
                              styles.boundTick,
                              { borderRightColor: colors.borderAccent },
                            ]}
                          />
                        </>
                      </View>
                      <View style={styles.rangeBar}>
                        {!!syncingStatus.scan_ranges &&
                          syncingStatus.scan_ranges.map(
                            (range: RPCSyncScanRangeStatusType) => {
                              const percent: number =
                                ((range.end_block - range.start_block) * 100) /
                                (info.latestBlock - wallet.birthday);
                              return (
                                <View
                                  key={`${range.start_block.toString() + '-' + range.end_block.toString()}`}
                                  style={[
                                    styles.rangeSegment,
                                    {
                                      backgroundColor: rangeColor(
                                        range.priority,
                                        colors,
                                      ),
                                      width: `${percent}%`,
                                    },
                                  ]}
                                />
                              );
                            },
                          )}
                      </View>
                    </DetailLine>
                    <DetailLine
                      label={translate('report.legend') as string}
                      screenName={screenName}
                    >
                      <View style={styles.legendCol}>
                        <View style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendSwatch,
                              { backgroundColor: colors.fgSuccess },
                            ]}
                          />
                          <Text
                            style={[
                              styles.legendText,
                              { color: colors.fgDefault },
                            ]}
                          >
                            {translate('report.scanned') as string}
                          </Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendSwatch,
                              { backgroundColor: colors.fgSyncing },
                            ]}
                          />
                          <Text
                            style={[
                              styles.legendText,
                              { color: colors.fgDefault },
                            ]}
                          >
                            {translate('report.scanning') as string}
                          </Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendSwatch,
                              { backgroundColor: colors.fgSubtle },
                            ]}
                          />
                          <Text
                            style={[
                              styles.legendText,
                              { color: colors.fgDefault },
                            ]}
                          >
                            {translate('report.lowpriority') as string}
                          </Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendSwatch,
                              { backgroundColor: colors.fgAccent },
                            ]}
                          />
                          <Text
                            style={[
                              styles.legendText,
                              { color: colors.fgDefault },
                            ]}
                          >
                            {translate('report.highpriority') as string}
                          </Text>
                        </View>
                      </View>
                    </DetailLine>
                  </>
                )}
              </View>
            </>
          ) : (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="large" color={colors.fgAccent} />
            </View>
          )}
          {(Number(background.date) > 0 ||
            Number(background.dateEnd) > 0 ||
            !!background.message ||
            !!background.error) && (
            <View style={styles.backgroundSection}>
              <DetailLine
                label={translate('report.lastbackgroundsync') as string}
                value={
                  //background.batches.toString() +
                  //translate('report.batches-date') +
                  moment(
                    Number(Number(background.date).toFixed(0)) * 1000,
                  ).format('YYYY MMM D h:mm:ss a') +
                  (Number(background.dateEnd) > 0 &&
                  Number(background.date) !== Number(background.dateEnd)
                    ? moment(
                        Number(Number(background.date).toFixed(0)) * 1000,
                      ).format('YYYY MMM D') ===
                      moment(
                        Number(Number(background.dateEnd).toFixed(0)) * 1000,
                      ).format('YYYY MMM D')
                      ? ' - ' +
                        moment(
                          Number(Number(background.dateEnd).toFixed(0)) * 1000,
                        ).format('h:mm:ss a')
                      : ' - ' +
                        moment(
                          Number(Number(background.dateEnd).toFixed(0)) * 1000,
                        ).format('YYYY MMM D h:mm:ss a')
                    : '')
                }
                screenName={screenName}
              />
              {!!background.message && (
                <RegText
                  style={styles.backgroundMessage}
                  color={colors.fgDefault}
                >
                  {background.message}
                </RegText>
              )}
              {!!background.error && (
                <LiquidPrimaryButton
                  title={translate('view-error') as string}
                  onPress={() => {
                    reportError(background.error ? background.error : '');
                  }}
                />
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    maxHeight: '90%',
  },
  scrollContent: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  netStatusRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginHorizontal: space.xl,
  },
  netStatusCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  netStatusIcon: {
    marginBottom: space.xs,
    marginLeft: space.xs,
  },
  syncSection: {
    display: 'flex',
    marginHorizontal: space.xl,
    marginBottom: space.xxxl,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  tickLabels: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
  tickRow: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
  },
  tick: {
    height: 10,
    borderRightWidth: 1,
    borderLeftWidth: 1,
  },
  serverBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: '100%',
    borderBottomWidth: 2,
    marginBottom: 0,
  },
  barSegment: {
    height: 10,
  },
  barSegmentStart: {
    borderLeftWidth: 1,
  },
  barSegmentEdge: {
    borderRightWidth: 1,
  },
  barSegmentUnderline: {
    borderBottomWidth: 5,
  },
  legendRow: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: space.xs,
  },
  legendSwatch: {
    display: 'flex',
    flexDirection: 'row',
    width: 10,
    height: 10,
    justifyContent: 'flex-start',
    margin: space.xs,
  },
  mapBoundsRow: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
  mapBoundsTicks: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  boundTick: {
    height: 10,
  },
  rangeBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: '100%',
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  rangeSegment: {
    height: 15,
  },
  legendCol: {
    display: 'flex',
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginTop: space.xs,
    marginLeft: space.sm,
  },
  legendItem: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
  },
  legendText: {
    marginRight: space.sm,
  },
  loadingRow: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space.xl,
  },
  backgroundSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginHorizontal: space.xl,
    width: '100%',
    marginBottom: space.xl,
  },
  backgroundMessage: {
    marginBottom: space.xl,
  },
});

export default SyncReport;
