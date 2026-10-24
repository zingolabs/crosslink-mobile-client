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
import { faQrcode } from '@fortawesome/free-solid-svg-icons';
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
import { Header } from '../Header';
import RPCModule from '../../app/RPCModule';
import AddressItem from '../Components/AddressItem';
import {
  RouteEnum,
  ScreenEnum,
  SnackbarDurationEnum,
} from '../../app/AppState';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { space, text, useTheme } from '../../app/theme';

type DataType = {
  svg: {
    fill: string;
  };
  value: number;
  key: string;
  address: string;
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

type InsightProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.Insight
>;

const Insight: React.FunctionComponent<InsightProps> = ({ navigation }) => {
  const { translate, addLastSnackbar, removeFirstSnackbar, setPrivacyOption } =
    useAppLoadedActions();
  const { privacy } = useAppLoadedSettings();
  const { info } = useAppLoadedWallet();
  const { snackbars } = useAppLoadedUi();
  const { colors } = useTheme();
  const { clear } = useToast();
  const screenName = ScreenEnum.Insight;

  const [pieAmounts, setPieAmounts] = useState<DataType[]>([]);
  const [expandAddress, setExpandAddress] = useState<boolean[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [tab, setTab] = useState<'sent' | 'sends' | 'memobytes'>('sent');
  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      let resultStr: string = '';
      switch (tab) {
        case 'sent':
          resultStr = await RPCModule.getTotalValueToAddressInfo();
          //console.log('################# value', resultStr);
          break;
        case 'sends':
          resultStr = await RPCModule.getTotalSpendsToAddressInfo();
          //console.log('################# sends', resultStr);
          break;
        case 'memobytes':
          resultStr = await RPCModule.getTotalMemobytesToAddressInfo();
          //console.log('################# memobytes', resultStr);
          break;
        default:
          break;
      }
      let resultJSON: Record<string, unknown>;
      try {
        resultJSON = await JSON.parse(resultStr);
      } catch (e) {
        resultJSON = {};
      }
      let amounts: { value: number; address: string; tag: string }[] = [];
      const resultJSONEntries: [string, number][] = Object.entries(
        resultJSON,
      ) as [string, number][];
      resultJSONEntries &&
        resultJSONEntries.forEach(([key, value]) => {
          if (!(tab !== 'sent' && key === 'fee')) {
            // excluding the fee for `sends` and `memobytes`.
            if (value > 0) {
              amounts.push({
                value: tab === 'sent' ? value / 10 ** 8 : value,
                address: key,
                tag: '',
              });
            }
          }
        });
      const randomColors = Utils.generateColorList(amounts.length);
      const newPieAmounts: DataType[] = amounts
        .sort((a, b) => b.value - a.value)
        .map((item, index) => {
          return {
            value: item.value,
            address: item.address,
            tag: item.tag,
            svg: {
              fill:
                item.address === 'fee' ? colors.fgMuted : randomColors[index],
            },
            color:
              item.address === 'fee' ? colors.fgMuted : randomColors[index],
            labelLineConfig: {
              color:
                item.address === 'fee' ? colors.fgMuted : randomColors[index],
            },
            key: `pie-${index}`,
          };
        });
      setPieAmounts(newPieAmounts);
      const newExpandAddress = Array(newPieAmounts.length).fill(false);
      setExpandAddress(newExpandAddress);
      setLoading(false);
    })();
  }, [colors.fgMuted, tab]);

  const selectExpandAddress = (index: number) => {
    let newExpandAddress = Array(expandAddress.length).fill(false);
    newExpandAddress[index] = true;
    setExpandAddress(newExpandAddress);
  };

  const line = (item: DataType, index: number) => {
    const totalValue = pieAmounts
      ? pieAmounts.reduce((acc, curr) => acc + curr.value, 0)
      : 0;
    const percent = (100 * item.value) / totalValue;
    // 30 characters per line
    const numLines =
      item.address.length < 40
        ? 2
        : item.address.length / (dimensions.width < 500 ? 21 : 30);
    return (
      <View style={styles.row} key={`tag-${index}`}>
        <View
          style={[
            styles.rowInner,
            item.address !== 'fee' ? styles.rowBordered : null,
            { borderBottomColor: colors.borderFaint },
          ]}
        >
          <View style={styles.rowLeft}>
            {(!expandAddress[index] || item.address === 'fee') && (
              <FontAwesomeIcon
                style={styles.rowIcon}
                size={45}
                icon={faQrcode}
                color={item.svg.fill}
              />
            )}
            {!!item.tag && (
              <FadeText style={styles.rowTag}>{item.tag}</FadeText>
            )}
            <TouchableOpacity
              onPress={() => {
                if (item.address !== 'fee') {
                  Clipboard.setString(item.address);
                  addLastSnackbar({
                    message: translate('history.addresscopied') as string,
                    duration: SnackbarDurationEnum.short,
                    screenName: [screenName],
                  });
                  selectExpandAddress(index);
                }
              }}
            >
              <View style={styles.addressCol}>
                {item.address !== 'fee' && (
                  <AddressItem
                    address={item.address}
                    screenName={screenName}
                    oneLine={true}
                    onlyContact={true}
                    withIcon={true}
                  />
                )}
                {!expandAddress[index] && !!item.address && (
                  <RegText>
                    {item.address.length > (dimensions.width < 500 ? 10 : 20)
                      ? Utils.trimToSmall(
                          item.address,
                          dimensions.width < 500 ? 5 : 10,
                        )
                      : item.address}
                  </RegText>
                )}
                {expandAddress[index] &&
                  !!item.address &&
                  Utils.splitStringIntoChunks(
                    item.address,
                    Number(numLines.toFixed(0)),
                  ).map((c: string, idx: number) => (
                    <RegText color={item.svg.fill} key={idx}>
                      {c}
                    </RegText>
                  ))}
              </View>
            </TouchableOpacity>
          </View>
          <View
            style={
              expandAddress[index] && item.address !== 'fee'
                ? styles.rowRightStacked
                : styles.rowRight
            }
          >
            <RegText>{getPercent(percent)}</RegText>
            {tab === 'sent' ? (
              <ZecAmount
                currencyName={info.currencyName}
                size={15}
                amtZec={item.value}
                style={styles.rowAmount}
                privacy={privacy}
              />
            ) : (
              <RegText style={styles.rowSends}>
                {'# ' +
                  item.value.toString() +
                  (tab === 'sends'
                    ? translate('insight.sends-unit')
                    : translate('insight.memobytes-unit'))}
              </RegText>
            )}
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

  const tabViews: Array<{
    key: 'sent' | 'sends' | 'memobytes';
    title: string;
    subtitle: string;
  }> = [
    {
      key: 'sent',
      title: translate('insight.sent') as string,
      subtitle: translate('insight.sent-text') as string,
    },
    {
      key: 'sends',
      title: translate('insight.sends') as string,
      subtitle: translate('insight.sends-text') as string,
    },
    {
      key: 'memobytes',
      title: translate('insight.memobytes') as string,
      subtitle: translate('insight.memobytes-text') as string,
    },
  ];

  //console.log('render insight');

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
        <Header
          title={translate('insight.title') as string}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noUfvkIcon={true}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
          closeScreen={() => {
            clear();
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
        />

        <View style={styles.tabsRow}>
          {tabViews.map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{ width: (dimensions.width - 20) / 3 }}
            >
              <View
                style={[
                  styles.tab,
                  tab === t.key ? styles.tabActive : null,
                  { borderBottomColor: colors.borderAccent },
                ]}
              >
                <RegText
                  style={[
                    tab === t.key ? text.subheadline : text.footnote,
                    tab === t.key && styles.tabTitleActive,
                    { color: colors.fgDefault },
                  ]}
                >
                  {t.title}
                </RegText>
                <RegText
                  style={[
                    text.caption2,
                    {
                      color: tab === t.key ? colors.fgAccent : colors.fgDefault,
                    },
                  ]}
                >
                  ({t.subtitle})
                </RegText>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView
          showsVerticalScrollIndicator={true}
          persistentScrollbar={true}
          indicatorStyle={'white'}
          style={styles.scroll}
          contentContainerStyle={{}}
        >
          <View style={styles.content}>
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
              <View style={styles.pieWrap}>
                {!!pieAmounts && !!pieAmounts.length && (
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
                    innerRadius={dimensions.width * 0.09}
                  />
                )}
              </View>
            )}
          </View>
          <View style={styles.listOuter}>
            <View style={styles.list}>
              {!loading && !!pieAmounts && !!pieAmounts.length && (
                <>
                  {pieAmounts
                    .filter(item => item.address === 'fee')
                    .map((item, index) => {
                      return line(item, index);
                    })}
                  <View
                    style={[
                      styles.feeSeparator,
                      { backgroundColor: colors.borderFaint },
                    ]}
                  />
                  {pieAmounts
                    .filter(item => item.address !== 'fee')
                    .map((item, index) => {
                      return line(item, index);
                    })}
                </>
              )}
            </View>
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
    width: '100%',
    flexDirection: 'row',
    marginTop: space.sm,
  },
  tab: {
    alignItems: 'center',
    paddingBottom: space.sm,
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabTitleActive: {
    fontWeight: 'bold',
  },
  scroll: {
    maxHeight: '90%',
  },
  content: {
    display: 'flex',
    margin: space.xl,
  },
  empty: {
    width: '100%',
    alignItems: 'center',
    marginTop: 100,
  },
  loader: {
    marginTop: 100,
  },
  pieWrap: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  listOuter: {
    display: 'flex',
    marginHorizontal: space.xs,
    padding: 0,
    alignItems: 'center',
  },
  list: {
    width: '100%',
  },
  feeSeparator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    width: '100%',
  },
  rowInner: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  rowBordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIcon: {
    margin: space.xs,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowRightStacked: {
    flexDirection: 'column-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowAmount: {
    marginHorizontal: space.xs,
  },
  rowSends: {
    marginLeft: space.sm,
  },
});

export default Insight;
