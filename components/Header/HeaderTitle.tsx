import { StyleSheet, Text, View } from 'react-native';
import { faChevronLeft, faXmark } from '@fortawesome/free-solid-svg-icons';
import { text, useTheme } from '../../app/theme';
import HeaderIconButton from './HeaderIconButton';

type HeaderTitleProps = {
  title: string;
  goBack: () => void;
  bottomSheet?: boolean;
  ExtraComponent?: React.ReactNode;
};

const HeaderTitle: React.FC<HeaderTitleProps> = ({
  title,
  goBack,
  bottomSheet,
  ExtraComponent,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.header}>
      <View style={styles.side}>
        <HeaderIconButton
          icon={bottomSheet ? faXmark : faChevronLeft}
          onPress={goBack}
          accessibilityLabel={bottomSheet ? 'Close' : 'Back'}
        />
      </View>

      <View pointerEvents="none" style={styles.titleContainer}>
        <Text
          numberOfLines={1}
          style={[styles.headerTitle, { color: colors.fgDefault }]}
        >
          {title}
        </Text>
      </View>

      <View style={styles.bubble}>{ExtraComponent && ExtraComponent}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 48,
    marginTop: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  side: {
    width: 58,
    justifyContent: 'center',
  },
  titleContainer: {
    position: 'absolute',
    left: 74,
    right: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    position: 'absolute',
    top: 2,
    right: 16,
  },
  headerTitle: {
    ...text.headline,
    textAlign: 'center',
  },
});

export default HeaderTitle;
