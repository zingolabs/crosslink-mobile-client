import React, { useCallback, useEffect, useRef, useState } from 'react';

import { LoadedAppStackParamList } from '../../app/types';
import {
  useAppLoadedActions,
  useAppLoadedWallet,
  useAppLoadedUi,
} from '../../app/context';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import {
  GlobalConst,
  RouteEnum,
  ScreenEnum,
  StakeType,
} from '../../app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HeaderTitle } from '../Header';
import Animated, {
  CSSTransitionProperties,
  cubicBezier,
} from 'react-native-reanimated';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import RegText from '../Components/RegText';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faAngleUp,
  faChevronRight,
  faCircle,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons';
import FadeText from '../Components/FadeText';
import Utils from '../../app/utils';
import AddressItem from '../Components/AddressItem';
import ChartPieIcon from '../../assets/icons/chart-pie.svg';
import ZcashIcon from '../../assets/icons/zcash.svg';
import ZecAmount from '../Components/ZecAmount';
import { XIcon } from '../Components/Icons/XIcon';
import StakingDayBubble from '../Staking/StakingDayBubble';
import {
  curve,
  duration,
  radiusCard,
  space,
  text,
  useTheme,
} from '../../app/theme';

type FinalizersProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.Finalizers
>;

const EASE_OUT = cubicBezier(curve[0], curve[1], curve[2], curve[3]);

const Finalizers: React.FunctionComponent<FinalizersProps> = ({
  navigation,
  route,
}) => {
  const setFinalizer =
    !!route.params && route.params.setFinalizer !== undefined
      ? route.params.setFinalizer
      : () => {};
  const scope =
    !!route.params && route.params.scope !== undefined
      ? route.params.scope
      : '';
  const exclude =
    !!route.params && route.params.exclude !== undefined
      ? route.params.exclude
      : '';

  const { colors } = useTheme();
  const { removeFirstSnackbar } = useAppLoadedActions();
  const { staked, globalStaked, info, walletBonds } = useAppLoadedWallet();
  const { snackbars } = useAppLoadedUi();
  const { clear } = useToast();
  const screenName = ScreenEnum.About;

  const [searchText, setSearchText] = useState<string>('');
  const [stakedFiltered, setStakedFiltered] = useState<StakeType[]>([]);
  const [randomColors, setRandomColors] = useState<string[]>([]);
  const [expandAddress, _setExpandAddress] = useState<boolean[]>([]);
  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const [isScrollingToTop, setIsScrollingToTop] = useState<boolean>(false);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let base: StakeType[] = scope === 'my' ? staked : globalStaked;

    if (exclude) base = base.filter(i => i.finalizer !== exclude);

    if (searchText !== '') {
      const q = searchText.toLowerCase();
      base = base.filter(i => i.finalizer.toLowerCase().includes(q));
    }

    base = base.sort((a, b) => b.votingPower - a.votingPower);

    const finalList =
      scope === 'network'
        ? base.map(s => {
            return {
              ...s,
              finalizer: s.finalizer,
            };
          })
        : base
            .filter(s => {
              let found = walletBonds.find(b => {
                return b.finalizer === s.finalizer;
              });

              if (found) {
                return true;
              }
            })
            .map(s => {
              return {
                ...s,
                finalizer: s.finalizer,
              };
            });
    const byFinalizer = new Map<string, (typeof finalList)[number]>();

    for (const s of finalList) {
      if (!byFinalizer.has(s.finalizer)) byFinalizer.set(s.finalizer, s);
    }

    const filteredFinalList = [...byFinalizer.values()];

    setStakedFiltered(filteredFinalList);

    if (randomColors.length === 0) {
      setRandomColors(Utils.generateColorList(finalList.length + 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalStaked, randomColors.length, searchText, staked]); // scope won't change

  const getPercent = (percent: number) => {
    return (
      (percent < 1
        ? '<1'
        : percent < 100 && percent >= 99
          ? '99'
          : percent.toFixed(0)) + '%'
    );
  };

  const handleScrollToTop = useCallback(() => {
    if (scrollViewRef.current && !isScrollingToTop) {
      setIsScrollingToTop(true);

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Force set to top immediately for UI feedback
      setIsAtTop(true);

      // Try multiple scroll methods for reliability
      try {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      } catch (error) {
        console.log('scrollToTop failed:', error);
      }
    }
  }, [isScrollingToTop]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      const isTop = contentOffset.y <= 100;

      // Always update isAtTop for manual scrolling
      setIsAtTop(isTop);

      // If we're scrolling to top and we've reached the top, stop the scrolling state
      if (isScrollingToTop && isTop) {
        setIsScrollingToTop(false);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
      }
    },
    [isScrollingToTop],
  );

  const press: CSSTransitionProperties = {
    transitionProperty: ['backgroundColor'],
    transitionDuration: `${duration.press}ms`,
    transitionTimingFunction: EASE_OUT,
  };

  const line = (item: StakeType, index: number, last: boolean) => {
    const totalValue = stakedFiltered
      ? stakedFiltered.reduce((acc, curr) => acc + curr.votingPower, 0)
      : 0;
    const percent = (100 * item.votingPower) / totalValue;
    // 30 characters per line
    const numLines =
      item.finalizer.length < 40
        ? 2
        : item.finalizer.length / (dimensions.width < 500 ? 21 : 30);
    return (
      <Pressable
        style={styles.rowPressable}
        key={`tag-${index}`}
        accessibilityRole="button"
        onPress={() => {
          setFinalizer(item.finalizer, item.votingPower);
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
        onPressIn={() => setPressedIndex(index)}
        onPressOut={() => setPressedIndex(null)}
        pressRetentionOffset={space.lg}
      >
        <Animated.View
          style={[
            styles.row,
            pressedIndex === index
              ? { backgroundColor: colors.bgPress }
              : styles.rowIdle,
            press,
            styles.rowBordered,
            last ? styles.rowLast : null,
            { borderBottomColor: colors.borderFaint },
          ]}
        >
          <View style={styles.rowLeft}>
            <FontAwesomeIcon
              style={styles.rowIcon}
              size={15}
              icon={faCircle}
              color={randomColors[index]}
            />
            <View>
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

              <View style={styles.rowStats}>
                <ChartPieIcon height={16} width={16} color={colors.fgDefault} />
                <FadeText style={styles.rowPercent}>
                  {getPercent(percent)}
                </FadeText>
                <ZcashIcon height={16} width={16} color={colors.fgDefault} />
                <ZecAmount
                  amtZec={item.votingPower}
                  size={14}
                  currencyName={info.currencyName}
                />
              </View>
            </View>
          </View>
          <View style={styles.rowChevronCol}>
            <FontAwesomeIcon
              style={styles.rowIcon}
              size={15}
              icon={faChevronRight}
              color={colors.fgDefault}
            />
          </View>
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <HeaderTitle
        title="Choose finalizer"
        goBack={() => {
          clear();
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
        ExtraComponent={<StakingDayBubble />}
      />

      <View style={[styles.searchBar, { backgroundColor: colors.bgSurface }]}>
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          size={17}
          color={colors.fgSubtle}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, text.body, { color: colors.fgDefault }]}
          placeholder="Search finalizer..."
          placeholderTextColor={colors.fgSubtle}
          keyboardType={'default'}
          value={searchText}
          onChangeText={setSearchText}
        />
        {!!searchText && (
          <TouchableOpacity
            onPress={() => {
              setSearchText('');
            }}
          >
            <View
              style={[styles.clearButton, { backgroundColor: colors.bgMuted }]}
            >
              <XIcon color={colors.bgCanvas} width={20} height={20} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {stakedFiltered && stakedFiltered.length > 0 && (
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          showsVerticalScrollIndicator={true}
          persistentScrollbar={true}
          indicatorStyle={'white'}
          style={styles.list}
          contentContainerStyle={{}}
        >
          <View
            style={[styles.listCard, { backgroundColor: colors.bgSurface }]}
          >
            {stakedFiltered.map((item, index) => {
              return line(item, index, index + 1 === stakedFiltered.length);
            })}
          </View>
          <View
            style={
              Platform.OS === GlobalConst.platformOSios
                ? styles.listFooterIos
                : styles.listFooter
            }
          />
        </ScrollView>
      )}

      {!isAtTop && (
        <Pressable
          onPress={handleScrollToTop}
          disabled={isScrollingToTop}
          style={({ pressed }) => [
            styles.scrollTop,
            pressed ? { transform: [{ scale: 0.9 }] } : null,
            {
              backgroundColor: colors.bgChrome,
              borderColor: colors.borderMuted,
              opacity: isScrollingToTop ? 0.5 : 1,
            },
          ]}
        >
          <FontAwesomeIcon
            style={styles.scrollTopIcon}
            size={16}
            icon={faAngleUp}
            color={colors.fgMuted}
          />
        </Pressable>
      )}
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  rowPressable: {
    width: '100%',
  },
  row: {
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
  rowIdle: {
    backgroundColor: 'transparent',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressCol: {
    display: 'flex',
    flexDirection: 'column',
    flexWrap: 'wrap',
  },
  rowChevronCol: {
    flexDirection: 'column-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIcon: {
    marginRight: space.lg,
  },
  rowStats: {
    marginTop: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: space.xs,
  },
  rowPercent: {
    marginRight: space.sm,
  },
  searchBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderRadius: 20,
    marginBottom: space.sm,
    height: 44,
    alignItems: 'center',
    paddingHorizontal: space.lg,
    margin: space.lg,
  },
  searchIcon: {
    marginRight: space.sm,
  },
  searchInput: {
    flex: 1,
  },
  clearButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 11,
    height: 22,
    width: 22,
    padding: 0,
  },
  list: {
    maxHeight: '100%',
  },
  listCard: {
    display: 'flex',
    marginHorizontal: space.sm,
    padding: space.xs,
    alignItems: 'flex-start',
    borderRadius: radiusCard,
  },
  listFooter: {
    height: 10,
  },
  listFooterIos: {
    height: 100,
  },
  scrollTop: {
    position: 'absolute',
    bottom: 30,
    right: space.xl,
    paddingHorizontal: space.xs,
    paddingVertical: space.sm,
    borderRadius: 50,
    borderWidth: 1,
  },
  scrollTopIcon: {
    marginLeft: space.xs,
    marginRight: space.xs,
    marginTop: 0,
  },
});

export default Finalizers;
