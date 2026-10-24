import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  CSSAnimationProperties,
  CSSTransitionProperties,
  Easing,
  LinearTransition,
  ReduceMotion,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { ToastProvider, useToast } from 'react-native-toastier';

import {
  ChainNameEnum,
  IndexerNetworkEnum,
  RouteEnum,
  ScreenEnum,
} from '../../AppState';
import { ContextAppLoading } from '../../context';
import { LoadingAppStackParamList } from '../../types';
import { Discover, Indexer, discoverIndexers, hostOf } from '../../indexers';
import { useIndexerDiscovery } from '../hooks/useIndexerDiscovery';
import Snackbars from '../../../components/Components/Snackbars';
import { HeaderTitle } from '../../../components/Header';
import BlurInText from '../../../components/Components/BlurInText';
import JellyLoader from '../../../components/Components/Icons/JellyLoader';
import LiquidPrimaryButton from '../../../components/Components/LiquidButton/LiquidPrimaryButton';
import { radiusPill, text, useTheme } from '../../theme';

export type ListedIndexersProps = {
  setIndexerServer: (
    u: string,
    c: ChainNameEnum,
    n?: IndexerNetworkEnum,
  ) => Promise<void>;
  closeServers: () => void;
  previousServer?: string;
  discover?: Discover;
};

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
const ROW_LAYOUT = LinearTransition.duration(350)
  .easing(Easing.bezier(0.77, 0, 0.175, 1))
  .reduceMotion(ReduceMotion.System);

type IndexerRowProps = {
  item: Indexer;
  selected: boolean;
  onPress: () => void;
};

const IndexerRow: React.FC<IndexerRowProps> = ({ item, selected, onPress }) => {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const check: CSSTransitionProperties = {
    transitionProperty: ['transform', 'opacity'],
    transitionDuration: reducedMotion ? '0ms' : '200ms',
    transitionTimingFunction: EASE_OUT,
  };

  const detail = `${item.latencyMs} ms`;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${hostOf(item.uri)}, ${detail}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      pressRetentionOffset={16}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.row,
            { backgroundColor: colors.bgSurface },
            pressed && styles.rowPressed,
          ]}
        >
          <Text
            style={[styles.rowTitle, { color: colors.fgDefault }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.6}
          >
            {hostOf(item.uri)}
          </Text>

          <BlurInText
            style={[styles.rowValue, { color: colors.fgSubtle }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.6}
          >
            {detail}
          </BlurInText>

          <Animated.View
            style={[
              styles.check,
              check,
              reducedMotion
                ? selected
                  ? styles.visible
                  : styles.hidden
                : selected
                  ? styles.checkOn
                  : styles.checkOff,
            ]}
          >
            <FontAwesomeIcon icon={faCheck} size={16} color={colors.fgAccent} />
          </Animated.View>
        </View>
      )}
    </Pressable>
  );
};

const Separator = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.separatorRow, { backgroundColor: colors.bgSurface }]}>
      <View
        style={[styles.separator, { backgroundColor: colors.borderFaint }]}
      />
    </View>
  );
};

const ListedIndexers: React.FC<ListedIndexersProps> = ({
  setIndexerServer,
  closeServers,
  previousServer,
  discover,
}) => {
  const { snackbars, removeFirstSnackbar } = useContext(ContextAppLoading);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { clear } = useToast();
  const reducedMotion = useReducedMotion();
  const navigation =
    useNavigation<NativeStackNavigationProp<LoadingAppStackParamList>>();
  const route =
    useRoute<RouteProp<LoadingAppStackParamList, RouteEnum.ListedIndexers>>();
  const screenName = ScreenEnum.Servers;

  const network = route.params?.network ?? IndexerNetworkEnum.stable;
  const discoverOnNetwork = useMemo(
    () => discover ?? ((n = network) => discoverIndexers(n)),
    [discover, network],
  );
  const { indexers, discovering, refresh } = useIndexerDiscovery(
    discoverOnNetwork,
    route.params?.report,
  );
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (selectedUri && indexers.some(i => i.uri === selectedUri)) {
      return;
    }
    const previous = indexers.find(i => i.uri === previousServer);
    setSelectedUri(previous?.uri ?? indexers[0]?.uri ?? null);
  }, [indexers, previousServer, selectedUri]);

  const goBack = () => {
    clear();
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      closeServers();
    }
  };

  const onConnect = async () => {
    if (!selectedUri || connecting) {
      return;
    }
    setConnecting(true);
    clear();
    await setIndexerServer(selectedUri, ChainNameEnum.testChainName, network);
    closeServers();
  };

  const nothingResponded = !discovering && indexers.length === 0;
  const showAction = !discovering;

  const materialize: CSSAnimationProperties = {
    animationName: {
      from: { opacity: 0, transform: [{ translateY: 16 }, { scale: 0.92 }] },
      to: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    },
    animationDuration: reducedMotion ? 0 : 450,
    animationTimingFunction: EASE_OUT,
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
        <HeaderTitle title="Discovered indexers" goBack={goBack} />

        {discovering ? (
          <View style={styles.loader}>
            <JellyLoader size={28} />
            <Text
              style={[styles.caption, { color: colors.fgSubtle }]}
              maxFontSizeMultiplier={1.6}
            >
              Asking the network for indexers.
            </Text>
          </View>
        ) : (
          <View style={[styles.group, { backgroundColor: colors.bgSurface }]}>
            <Animated.FlatList
              data={indexers}
              keyExtractor={item => item.uri}
              bounces={false}
              itemLayoutAnimation={ROW_LAYOUT}
              ItemSeparatorComponent={Separator}
              renderItem={({ item }) => (
                <IndexerRow
                  item={item}
                  selected={selectedUri === item.uri}
                  onPress={() => setSelectedUri(item.uri)}
                />
              )}
            />
          </View>
        )}

        {nothingResponded && (
          <Text style={[styles.caption, { color: colors.fgSubtle }]}>
            No indexer on this chain answered.
          </Text>
        )}

        <View
          style={[
            styles.actions,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {showAction && (
            <Animated.View
              key={nothingResponded ? 'retry' : 'continue'}
              style={[styles.action, materialize]}
            >
              {nothingResponded ? (
                <LiquidPrimaryButton
                  title="Check again"
                  onPress={refresh}
                  style={styles.stretch}
                />
              ) : (
                <LiquidPrimaryButton
                  title="Continue"
                  disabled={connecting || !selectedUri}
                  onPress={onConnect}
                  style={styles.stretch}
                />
              )}
            </Animated.View>
          )}
        </View>
      </View>
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  group: {
    flexShrink: 1,
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: 18,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  loader: {
    marginTop: 48,
    alignItems: 'center',
    gap: 16,
  },
  row: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowPressed: {
    backgroundColor: '#2C2C2E',
  },
  rowTitle: {
    ...text.body,
    flex: 1,
  },
  rowValue: {
    ...text.subheadline,
    marginLeft: 12,
  },
  check: {
    width: 24,
    height: 24,
    marginLeft: 8,
    borderRadius: radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visible: {
    opacity: 1,
  },
  hidden: {
    opacity: 0,
  },
  checkOn: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  checkOff: {
    opacity: 0,
    transform: [{ scale: 0.6 }],
  },
  separatorRow: {
    paddingLeft: 16,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  caption: {
    ...text.footnote,
    marginTop: 8,
    marginHorizontal: 36,
    textAlign: 'center',
  },
  actions: {
    marginTop: 'auto',
    paddingHorizontal: 20,
    paddingTop: 12,
    minHeight: 50,
  },
  action: {
    opacity: 1,
    transform: [{ translateY: 0 }, { scale: 1 }],
  },
  stretch: {
    alignSelf: 'stretch',
  },
});

export default ListedIndexers;
