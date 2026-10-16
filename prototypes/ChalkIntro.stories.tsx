import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import ChalkColumns, { ChalkColumnsProps } from './ChalkColumns';
import { EaseName, eases, timeline } from './motion/timeline';
import { useTimeline } from './motion/useTimeline';
import { Frame, range } from './shaders/storyFrame';

type IntroArgs = Omit<ChalkColumnsProps, 'reveal'> & {
  lightsDuration: number;
  lightsEase: EaseName;
  columnsDelay: number;
  columnsDuration: number;
  columnsEase: EaseName;
  lineDelay: number;
  lineDuration: number;
  lineEase: EaseName;
  flashDuration: number;
  rectDelay: number;
  rectDuration: number;
  autoplay: boolean;
  time: number;
  withButtons: boolean;
};

const ChalkIntro: React.FC<IntroArgs> = ({
  lightsDuration,
  lightsEase,
  columnsDelay,
  columnsDuration,
  columnsEase,
  lineDelay,
  lineDuration,
  lineEase,
  flashDuration,
  rectDelay,
  rectDuration,
  autoplay,
  time,
  withButtons,
  ...chalk
}) => {
  const tl = useMemo(
    () =>
      timeline()
        .to('lights', { duration: lightsDuration, ease: lightsEase })
        .to(
          'columns',
          { duration: columnsDuration, ease: columnsEase },
          `+=${columnsDelay}`,
        )
        .to(
          'line',
          { duration: lineDuration, ease: lineEase },
          `+=${lineDelay}`,
        )
        .to('flash', { from: 0, to: 1, duration: 0.05, ease: 'outExpo' }, '<')
        .to(
          'flash',
          { from: 1, to: 0, duration: flashDuration, ease: 'outQuint' },
          '<+=0.05',
        )
        .to(
          'rect',
          { duration: rectDuration, ease: 'outQuad' },
          `+=${rectDelay}`,
        ),
    [
      lightsDuration,
      lightsEase,
      columnsDelay,
      columnsDuration,
      columnsEase,
      lineDelay,
      lineDuration,
      lineEase,
      flashDuration,
      rectDelay,
      rectDuration,
    ],
  );
  const { time: now, values, replay } = useTimeline(tl, { autoplay, time });

  return (
    <Frame withButtons={withButtons}>
      <ChalkColumns {...chalk} reveal={values} />
      <View style={styles.hud} pointerEvents="box-none">
        <Text style={styles.clock}>
          {now.toFixed(2)}s / {tl.duration.toFixed(2)}s
        </Text>
        <Pressable onPress={replay} style={styles.replay}>
          <Text style={styles.replayLabel}>Replay</Text>
        </Pressable>
      </View>
    </Frame>
  );
};

const styles = StyleSheet.create({
  hud: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clock: { color: '#666', fontVariant: ['tabular-nums'], fontSize: 12 },
  replay: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  replayLabel: { color: '#ccc', fontSize: 12 },
});

const easeOptions = Object.keys(eases) as EaseName[];

/**
 * A GSAP-style timeline drives four reveal channels in the chalk shader.
 * Sequence: the short dashes switch on one by one like lights, the eight
 * columns draw downward together and stop dead on the baseline, the
 * baseline flashes out from the centre, then the rectangle fades in.
 * Turn off autoplay to scrub with the time control.
 */
const meta = {
  title: 'Prototypes/Chalk columns/Intro',
  component: ChalkIntro,
  argTypes: {
    lightsDuration: range(0.2, 4, 0.05),
    lightsEase: { control: 'select', options: easeOptions },
    columnsDelay: range(-1.5, 2, 0.05),
    columnsDuration: range(0.2, 3, 0.05),
    columnsEase: { control: 'select', options: easeOptions },
    lineDelay: range(0, 1, 0.05),
    lineDuration: range(0.1, 2, 0.05),
    lineEase: { control: 'select', options: easeOptions },
    flashDuration: range(0.1, 2, 0.05),
    rectDelay: range(0, 2, 0.05),
    rectDuration: range(0.1, 2, 0.05),
    autoplay: { control: 'boolean' },
    time: range(0, 8, 0.01),
    glow: range(0, 2, 0.05),
    density: range(0, 1.5, 0.01),
    pressure: range(0.2, 1.5, 0.01),
    rise: range(0, 4, 0.1),
    seed: range(1, 50, 1),
    spanTop: range(0, 0.3, 0.01),
    spanBottom: range(0, 0.3, 0.01),
    withButtons: { control: 'boolean' },
  },
  args: {
    lightsDuration: 2.8,
    lightsEase: 'linear',
    columnsDelay: -0.5,
    columnsDuration: 1.1,
    columnsEase: 'inQuart',
    lineDelay: 0,
    lineDuration: 0.45,
    lineEase: 'outExpo',
    flashDuration: 1.2,
    rectDelay: 0.3,
    rectDuration: 0.6,
    autoplay: true,
    time: 0,
    glow: 1,
    density: 0.8,
    pressure: 0.8,
    rise: 0,
    seed: 1,
    columnTop: 0.48,
    mask: 'dissolve',
    maskFeather: 0.1,
    maskPad: -0.03,
    spanTop: 0.18,
    spanBottom: 0,
    withButtons: false,
  },
} satisfies Meta<typeof ChalkIntro>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Play: Story = {
  args: {
    glow: 0.3,
    density: 1.5,
  },
};
export const Scrub: Story = { args: { autoplay: false, time: 2.4 } };
export const Snappier: Story = {
  args: {
    lightsDuration: 0.9,
    columnsDuration: 0.7,
    columnsEase: 'inExpo',
    lineDuration: 0.3,
  },
};
