import React, { useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  faServer,
  faSliders,
  faFlask,
} from '@fortawesome/free-solid-svg-icons';
import { ToastProvider, useToast } from 'react-native-toastier';

import { RouteEnum, ScreenEnum, IndexerNetworkEnum } from '../../AppState';
import { ContextAppLoading } from '../../context';
import { LoadingAppStackParamList } from '../../types';
import { Discover } from '../../indexers';
import { useIndexerDiscovery } from '../hooks/useIndexerDiscovery';
import Snackbars from '../../../components/Components/Snackbars';
import BlurInText from '../../../components/Components/BlurInText';
import JellyLoader from '../../../components/Components/Icons/JellyLoader';
import OptionCard from '../../../components/Components/OptionCard';
import { HeaderTitle } from '../../../components/Header';
import { text, useTheme } from '../../theme';

export type ChooseIndexerProps = {
  discover?: Discover;
};

const ChooseIndexer: React.FC<ChooseIndexerProps> = ({ discover }) => {
  const { snackbars, removeFirstSnackbar } = useContext(ContextAppLoading);
  const { colors } = useTheme();
  const { clear } = useToast();
  const navigation =
    useNavigation<NativeStackNavigationProp<LoadingAppStackParamList>>();
  const screenName = ScreenEnum.Servers;

  const { report, indexers, discovering } = useIndexerDiscovery(discover);

  const summary = discovering
    ? ''
    : indexers.length > 0
      ? `${indexers.length} reachable`
      : 'None reachable right now';
  const summaryColor =
    !discovering && indexers.length === 0 ? colors.fgDanger : colors.fgSubtle;

  const goBack = () => {
    clear();
    navigation.goBack();
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
        <HeaderTitle title="Choose indexer" goBack={goBack} />

        <View style={styles.content}>
          <Text
            style={[styles.lede, { color: colors.fgSubtle }]}
            maxFontSizeMultiplier={1.6}
          >
            Pick where this wallet reads the chain from.
          </Text>

          <View>
            <OptionCard
              title="Discovered indexers"
              icon={faServer}
              tint="accent"
              detail={
                discovering ? (
                  <View style={styles.loader}>
                    <JellyLoader size={16} />
                  </View>
                ) : (
                  <BlurInText
                    style={[styles.summary, { color: summaryColor }]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.6}
                  >
                    {summary}
                  </BlurInText>
                )
              }
              onPress={() =>
                navigation.navigate(RouteEnum.ListedIndexers, {
                  report: report ?? undefined,
                })
              }
            />
            <OptionCard
              title="Custom indexer"
              icon={faSliders}
              onPress={() => navigation.navigate(RouteEnum.CustomIndexer)}
            />
            <OptionCard
              title="Nightly chain"
              icon={faFlask}
              detail="Experimental crosslink nightly indexers"
              onPress={() =>
                navigation.navigate(RouteEnum.ListedIndexers, {
                  network: IndexerNetworkEnum.nightly,
                })
              }
            />
          </View>
        </View>
      </View>
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  lede: {
    ...text.subheadline,
    marginTop: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  loader: {
    height: 20,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 2,
  },
  summary: {
    ...text.footnote,
    marginTop: 2,
  },
});

export default ChooseIndexer;
