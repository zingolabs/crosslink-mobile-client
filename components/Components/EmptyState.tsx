import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { text, useTheme } from '../../app/theme';
import ChalkLoop, { ChalkLoopName } from './ChalkLoop';
import { SUMMARY_RADIUS } from './SummaryPanel';

type EmptyStateProps = {
  art: ChalkLoopName;
  title: string;
  body?: string;
};

/** Centered chalk loop with a headline and one optional line under it. */
const EmptyState: React.FC<EmptyStateProps> = ({ art, title, body }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.root}>
      <ChalkLoop name={art} />
      <Text style={[text.headline, styles.title, { color: colors.fgDefault }]}>
        {title}
      </Text>
      {!!body && (
        <Text
          style={[text.subheadline, styles.body, { color: colors.fgSubtle }]}
        >
          {body}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: SUMMARY_RADIUS,
    paddingBottom: 80,
  },
  title: {
    marginTop: 4,
    textAlign: 'center',
  },
  body: {
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 260,
  },
});

export default EmptyState;
