import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

import { PieChart, pieDataItem } from 'react-native-gifted-charts';
import { Text as SvgText } from 'react-native-svg';
import { faCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import Clipboard from '@react-native-clipboard/clipboard';

import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import { LoadedAppStackParamList } from '../../app/types';
import {
  useAppLoadedActions,
  useAppLoadedSettings,
  useAppLoadedWallet,
  useAppLoadedUi,
} from '../../app/context';
import Utils from '../../app/utils';
import FadeText from '../Components/FadeText';
import { HeaderTitle } from '../Header';
//import RPCModule from '../../app/RPCModule';
import AddressItem from '../Components/AddressItem';
import {
  RouteEnum,
  ScreenEnum,
  SnackbarDurationEnum,
  StakeType,
} from '../../app/AppState';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { radiusCard, space, text, useTheme } from '../../app/theme';

type DataType = {
  svg: {
    fill: string;
  };
  value: number;
  key: string;
  finalizer: string;
  tag: string;
} & pieDataItem;

const getPercent = (percent: number) => {
  return (
    (percent < 1
      ? '<1'
      : percent < 100 && percent >= 99
        ? '99'
        : percent.toFixed(0)) + '%'
  );
};

type DistributionProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.Distribution
>;

const Distribution: React.FunctionComponent<DistributionProps> = ({
  navigation,
}) => {
  const { translate, addLastSnackbar, removeFirstSnackbar } =
    useAppLoadedActions();
  const { privacy } = useAppLoadedSettings();
  const { info, staked, globalStaked } = useAppLoadedWallet();
  const { snackbars } = useAppLoadedUi();
  const { colors } = useTheme();
  const { clear } = useToast();
  const screenName = ScreenEnum.Insight;

  const rc = Utils.generateColorList(50);

  const [pieAmounts, setPieAmounts] = useState<DataType[]>([]);
  const [randomColors, setRandomColors] = useState<string[]>(rc);
  const [expandAddress, setExpandAddress] = useState<boolean[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [tab, setTab] = useState<'my' | 'network'>('my');
  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      let resultJSON: StakeType[] = [];
      switch (tab) {
        case 'my':
          resultJSON = staked;
          break;
        case 'network':
          resultJSON = globalStaked;
          break;
        default:
          break;
      }
      console.log(resultJSON);
      if (randomColors.length < resultJSON.length) {
        const rc2 = Utils.generateColorList(resultJSON.length + 10);
        setRandomColors(rc2);
      }
      const newPieAmounts: DataType[] = resultJSON
        .filter((i: StakeType) => i.votingPower > 0 && !!i.finalizer)
        .sort((a, b) => b.votingPower - a.votingPower)
        .map((item, index) => {
          return {
            value: item.votingPower,
            finalizer: item.finalizer,
            tag: '',
            svg: { fill: randomColors[index] },
            color: randomColors[index],
            labelLineConfig: {
              color: randomColors[index],
            },
            key: `pie-${index}`,
          };
        });
      console.log(newPieAmounts);
      setPieAmounts(newPieAmounts);
      const newExpandAddress = Array(newPieAmounts.length).fill(false);
      setExpandAddress(newExpandAddress);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors.fgMuted, globalStaked, staked, tab]);

  const selectExpandAddress = (index: number) => {
    let newExpandAddress = Array(expandAddress.length).fill(false);
    newExpandAddress[index] = true;
    setExpandAddress(newExpandAddress);
  };

  const rowStyle = (last: boolean) => [
    styles.rowInner,
    last ? styles.rowLast : styles.rowBordered,
    { borderBottomColor: colors.borderFaint },
  ];

  const lineMy = (item: DataType, index: number, last: boolean) => {
    const totalValue = pieAmounts
      ? pieAmounts.reduce((acc, curr) => acc + curr.value, 0)
      : 0;
    const percent = (100 * item.value) / totalValue;
    // 30 characters per line
    const numLines =
      item.finalizer.length < 40
        ? 2
        : item.finalizer.length / (dimensions.width < 500 ? 21 : 30);
    return (
      <View style={styles.row} key={`tag-${index}`}>
        <View style={rowStyle(last)}>
          <View style={styles.rowLeft}>
            <FontAwesomeIcon
              style={styles.rowIcon}
              size={15}
              icon={faCircle}
              color={item.svg.fill}
            />
            {!!item.tag && (
              <FadeText style={styles.rowTag}>{item.tag}</FadeText>
            )}
            <TouchableOpacity
              onPress={() => {
                Clipboard.setString(item.finalizer);
                addLastSnackbar({
                  message: translate('history.addresscopied') as string,
                  duration: SnackbarDurationEnum.short,
                  screenName: [screenName],
                });
                selectExpandAddress(index);
              }}
            >
              <View style={styles.addressCol}>
                <AddressItem
                  address={item.finalizer}
                  screenName={screenName}
                  oneLine={true}
                  onlyContact={true}
                  withIcon={true}
                />
                {!expandAddress[index] && !!item.finalizer && (
                  <RegText>
                    {item.finalizer.length > (dimensions.width < 500 ? 10 : 20)
                      ? Utils.trimToSmall(
                          item.finalizer,
                          dimensions.width < 500 ? 5 : 10,
                        )
                      : item.finalizer}
                  </RegText>
                )}
                {expandAddress[index] &&
                  !!item.finalizer &&
                  Utils.splitStringIntoChunks(
                    item.finalizer,
                    Number(numLines.toFixed(0)),
                  ).map((c: string, idx: number) => (
                    <RegText key={idx}>{c}</RegText>
                  ))}
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.rowRight}>
            <FadeText>{getPercent(percent)}</FadeText>
          </View>
        </View>
      </View>
    );
  };

  const lineNetwork = (item: DataType, index: number, last: boolean) => {
    const totalValue = pieAmounts
      ? pieAmounts.reduce((acc, curr) => acc + curr.value, 0)
      : 0;
    const percent = (100 * item.value) / totalValue;
    // 30 characters per line
    const numLines =
      item.finalizer.length < 40
        ? 2
        : item.finalizer.length / (dimensions.width < 500 ? 21 : 30);
    return (
      <View style={styles.row} key={`tag-${index}`}>
        <View style={rowStyle(last)}>
          <View style={styles.rowLeft}>
            <FadeText
              style={styles.rowRank}
            >{`#${(index + 1).toString()}`}</FadeText>
            {!!item.tag && (
              <FadeText style={styles.rowTag}>{item.tag}</FadeText>
            )}
            <TouchableOpacity
              onPress={() => {
                Clipboard.setString(item.finalizer);
                addLastSnackbar({
                  message: translate('history.addresscopied') as string,
                  duration: SnackbarDurationEnum.short,
                  screenName: [screenName],
                });
                selectExpandAddress(index);
              }}
            >
              <View style={styles.addressCol}>
                <AddressItem
                  address={item.finalizer}
                  screenName={screenName}
                  oneLine={true}
                  onlyContact={true}
                  withIcon={true}
                />
                {!expandAddress[index] && !!item.finalizer && (
                  <RegText>
                    {item.finalizer.length > (dimensions.width < 500 ? 10 : 20)
                      ? Utils.trimToSmall(
                          item.finalizer,
                          dimensions.width < 500 ? 5 : 10,
                        )
                      : item.finalizer}
                  </RegText>
                )}
                {expandAddress[index] &&
                  !!item.finalizer &&
                  Utils.splitStringIntoChunks(
                    item.finalizer,
                    Number(numLines.toFixed(0)),
                  ).map((c: string, idx: number) => (
                    <RegText key={idx}>{c}</RegText>
                  ))}
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.barArea}>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { backgroundColor: colors.bgMuted }]} />
              <View
                style={[
                  styles.bar,
                  styles.barFill,
                  { backgroundColor: item.svg.fill, width: `${percent}%` },
                ]}
              />
            </View>
            <FadeText>{getPercent(percent)}</FadeText>
          </View>
        </View>
      </View>
    );
  };

  const renderExternalLabel = useCallback(
    (item: pieDataItem | undefined) => (
      <SvgText fontSize={12} fill={item?.color}>
        {Number(item?.value.toFixed(2))}
      </SvgText>
    ),
    [],
  );

  //console.log('render insight');

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
        <HeaderTitle
          title="Distribution"
          goBack={() => {
            clear();
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
        />

        <View style={[styles.tabsRow, { backgroundColor: colors.bgSurface }]}>
          <View
            style={[
              styles.tabPill,
              tab === 'my'
                ? { backgroundColor: colors.bgFaint }
                : styles.tabPillIdle,
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                const rc3 = Utils.generateColorList(pieAmounts.length + 10);
                setRandomColors(rc3);
                setTab('my');
              }}
            >
              <RegText
                style={[
                  text.subheadline,
                  tab === 'my' && styles.tabLabelActive,
                  { color: tab === 'my' ? colors.fgDefault : colors.fgSubtle },
                ]}
              >
                {'My Staking'}
              </RegText>
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.tabPill,
              tab === 'network'
                ? { backgroundColor: colors.bgFaint }
                : styles.tabPillIdle,
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                const rc4 = Utils.generateColorList(pieAmounts.length + 10);
                setRandomColors(rc4);
                setTab('network');
              }}
            >
              <RegText
                style={[
                  text.subheadline,
                  tab === 'network' && styles.tabLabelActive,
                  {
                    color:
                      tab === 'network' ? colors.fgDefault : colors.fgSubtle,
                  },
                ]}
              >
                {'Global Network'}
              </RegText>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={true}
          persistentScrollbar={true}
          indicatorStyle={'white'}
          style={styles.scroll}
          contentContainerStyle={{}}
        >
          <View style={styles.listOuter}>
            {!loading && (!pieAmounts || !pieAmounts.length) && (
              <View style={styles.empty}>
                <RegText>{translate('insight.no-data') as string}</RegText>
              </View>
            )}
            {loading ? (
              <ActivityIndicator
                size="large"
                color={colors.fgAccent}
                style={styles.loader}
              />
            ) : (
              <View style={styles.pieArea}>
                {!!pieAmounts && !!pieAmounts.length && (
                  <>
                    <PieChart
                      showExternalLabels={true}
                      labelLineConfig={{
                        thickness: 1,
                        avoidOverlappingOfLabels: true,
                      }}
                      strokeWidth={4}
                      donut={true}
                      innerCircleColor={colors.bgCanvas}
                      innerCircleBorderWidth={0}
                      innerCircleBorderColor={colors.bgCanvas}
                      strokeColor={colors.bgCanvas}
                      showValuesAsTooltipText={true}
                      showText
                      externalLabelComponent={renderExternalLabel}
                      textBackgroundColor={colors.bgCanvas}
                      data={pieAmounts}
                      innerRadius={dimensions.width * 0.14}
                    />
                    <View style={styles.totalRow}>
                      <RegText>
                        {tab === 'my' ? 'Total Stake' : 'Total amount Staked'}
                      </RegText>
                      <ZecAmount
                        currencyName={info.currencyName}
                        size={20}
                        amtZec={pieAmounts.reduce(
                          (sum, item) => sum + item.value,
                          0,
                        )}
                        style={styles.totalAmount}
                        privacy={privacy}
                      />
                    </View>
                    <RegText style={styles.listTitle}>
                      {tab === 'my' ? 'Staking Position' : 'Finalizers'}
                    </RegText>
                    <View
                      style={[
                        styles.listCard,
                        { backgroundColor: colors.bgFaint },
                      ]}
                    >
                      <View style={styles.list}>
                        {!loading && !!pieAmounts && !!pieAmounts.length && (
                          <>
                            {pieAmounts.map((item, index) => {
                              return tab === 'my'
                                ? lineMy(
                                    item,
                                    index,
                                    index + 1 === pieAmounts.length,
                                  )
                                : lineNetwork(
                                    item,
                                    index,
                                    index + 1 === pieAmounts.length,
                                  );
                            })}
                          </>
                        )}
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xl,
    borderRadius: 20,
    padding: space.xs,
    marginHorizontal: space.xl,
  },
  tabPill: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    padding: space.xs,
    overflow: 'hidden',
  },
  tabPillIdle: {
    backgroundColor: 'transparent',
  },
  tabLabelActive: {
    fontWeight: 'bold',
  },
  scroll: {
    maxHeight: '90%',
  },
  listOuter: {
    display: 'flex',
  },
  empty: {
    alignItems: 'center',
    marginTop: 100,
    marginHorizontal: space.xl,
  },
  loader: {
    marginTop: 100,
  },
  pieArea: {
    width: '100%',
    alignItems: 'center',
  },
  totalRow: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: space.xxxl,
  },
  totalAmount: {
    marginHorizontal: space.xs,
  },
  listTitle: {
    marginHorizontal: space.sm,
    marginBottom: space.sm,
  },
  listCard: {
    display: 'flex',
    marginHorizontal: space.sm,
    padding: space.xs,
    alignItems: 'flex-start',
    borderRadius: radiusCard,
    width: '90%',
  },
  list: {
    width: '100%',
  },
  row: {
    width: '100%',
  },
  rowInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  rowBordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIcon: {
    marginRight: space.lg,
  },
  rowRank: {
    marginRight: space.lg,
  },
  rowTag: {
    marginHorizontal: space.xs,
  },
  addressCol: {
    display: 'flex',
    flexDirection: 'column',
    flexWrap: 'wrap',
  },
  rowRight: {
    flexDirection: 'column-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barArea: {
    marginLeft: space.xxl,
    flexGrow: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barTrack: {
    justifyContent: 'flex-end',
    width: '100%',
    height: 5,
    marginTop: space.sm,
    borderRadius: 3,
  },
  bar: {
    height: 5,
    width: '100%',
    borderRadius: 3,
  },
  barFill: {
    marginTop: -5,
  },
});

export default Distribution;
