import React from 'react';
import { StyleSheet, View } from 'react-native';

import ChalkColumns from '../../prototypes/ChalkColumns';
import { Wordmark } from '../../prototypes/ChalkWordmark';
import type { ChalkReveal } from './useChalkIntro';

export const CHALK_INK = '#e4e1d8';
export const TITLE_SIZE = 44;
export const TITLE_LINE = 52;
export const TITLE_GAP = 56;
export const LINE_ABOVE_TITLE = 22;

export type ChalkBackgroundProps = {
  width: number;
  height: number;
  actionsHeight: number;
  reveal: ChalkReveal;
  title?: string;
};

export const chalkLayout = (height: number, actionsHeight: number) => {
  const titleBottom = height - actionsHeight - TITLE_GAP;
  const titleTop = titleBottom - TITLE_LINE;
  const baseline =
    height > 0 ? (height - (titleTop - LINE_ABOVE_TITLE)) / height : 0.3;
  return { titleTop, baseline };
};

const ChalkBackground: React.FC<ChalkBackgroundProps> = ({
  height,
  actionsHeight,
  reveal,
}) => {
  const { titleTop, baseline } = chalkLayout(height, actionsHeight);
  return (
    <View
      style={[StyleSheet.absoluteFill, { opacity: reveal.paper.value }]}
      pointerEvents="none"
    >
      <ChalkColumns
        colorChalk={CHALK_INK}
        pressure={0.82}
        density={0.75}
        glow={0.5}
        columnTop={0.48}
        rainTop={0.9}
        spanTop={0.1}
        seed={4}
        mask="dissolve"
        maskFeather={0.1}
        maskPad={-0.03}
        rise={0}
        baseline={baseline}
        reveal={{
          lights: reveal.lights.value,
          columns: reveal.columns.value,
          line: reveal.line.value,
          flash: reveal.flash.value,
          rect: 0,
        }}
      />
      <View
        style={[
          styles.title,
          { top: titleTop, height: TITLE_LINE, opacity: reveal.title.value },
        ]}
      >
        <Wordmark variant="pixelSquare" color={CHALK_INK} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChalkBackground;
