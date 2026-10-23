/* eslint-disable react-native/no-inline-styles */
// A living brand manual. Everything on this page reads from `app/theme`, so
// a token edit shows up here first. Iterate on the tokens, not on this file.
import React from 'react';
import { Image, ScrollView, Text, View } from 'react-native';

import {
  fontFamily,
  mono,
  text,
  TextStyleName,
  ThemeColors,
  useTheme,
} from '../app/theme';
import Button from '../components/Components/Button';
import ZecAmount from '../components/Components/ZecAmount';
import CurrencyAmount from '../components/Components/CurrencyAmount';
import RegText from '../components/Components/RegText';
import BoldText from '../components/Components/BoldText';
import FadeText from '../components/Components/FadeText';
import ErrorText from '../components/Components/ErrorText';
import { CurrencyEnum, CurrencyNameEnum } from '../app/AppState';

type TokenName = keyof ThemeColors;

const GROUPS: { title: string; note: string; tokens: TokenName[] }[] = [
  {
    title: 'Backgrounds',
    note: 'Canvas is the screen. Surface is a card on the canvas. Chrome is the drawer and menus.',
    tokens: ['bgCanvas', 'bgSurface', 'bgChrome'],
  },
  {
    title: 'Neutral scale',
    note: 'Default > muted > subtle > faint. Use the same rung across fg, border and bg.',
    tokens: [
      'fgDefault',
      'fgMuted',
      'borderMuted',
      'bgMuted',
      'fgSubtle',
      'borderSubtle',
      'fgFaint',
      'borderFaint',
      'bgFaint',
    ],
  },
  {
    title: 'Accent',
    note: 'One accent. Primary actions, selected states, links.',
    tokens: [
      'fgAccent',
      'borderAccent',
      'bgAccent',
      'fgAccentDisabled',
      'borderAccentDisabled',
    ],
  },
  {
    title: 'Status',
    note: 'Syncing is transient. Warning asks for attention. Danger is destructive.',
    tokens: [
      'fgSyncing',
      'bgSyncing',
      'fgWarning',
      'fgWarningEmphasis',
      'fgWarningMuted',
      'borderWarning',
      'bgWarning',
      'fgDanger',
      'borderDanger',
      'bgDanger',
    ],
  },
];

const TYPE_SCALE = Object.keys(text) as TextStyleName[];

const SPACING = [4, 8, 12, 16, 20, 24, 32, 40];
const RADII = [5, 15, 16, 18, 25, 28, 50];

const Section: React.FunctionComponent<{
  title: string;
  note?: string;
  children: React.ReactNode;
}> = ({ title, note, children }) => {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 32 }}>
      <Text
        style={{
          color: colors.fgSubtle,
          fontSize: 12,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {title}
      </Text>
      {note ? (
        <Text style={{ color: colors.fgMuted, fontSize: 14, marginBottom: 12 }}>
          {note}
        </Text>
      ) : null}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.borderFaint,
          paddingTop: 12,
        }}
      >
        {children}
      </View>
    </View>
  );
};

const Swatch: React.FunctionComponent<{ name: TokenName }> = ({ name }) => {
  const { colors } = useTheme();
  const value = colors[name];
  return (
    <View style={{ width: 108, marginRight: 12, marginBottom: 16 }}>
      <View
        style={{
          height: 56,
          borderRadius: 8,
          backgroundColor: value,
          borderWidth: 1,
          borderColor: colors.borderFaint,
        }}
      />
      <Text style={{ color: colors.fgDefault, fontSize: 12, marginTop: 6 }}>
        {name}
      </Text>
      <Text
        style={{
          color: colors.fgSubtle,
          fontSize: 11,
          fontFamily: 'monospace',
        }}
      >
        {value}
      </Text>
    </View>
  );
};

const Row: React.FunctionComponent<{ children: React.ReactNode }> = ({
  children,
}) => (
  <View
    style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}
  >
    {children}
  </View>
);

const BrandManual: React.FunctionComponent = () => {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgCanvas }}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
    >
      {/* Cover */}
      <View style={{ marginBottom: 40 }}>
        <Image
          source={require('../assets/img/logobig-zingo-delegator.png')}
          style={{ width: 96, height: 96, marginBottom: 16 }}
          resizeMode="contain"
        />
        <Text
          style={{ color: colors.fgDefault, fontSize: 30, fontWeight: '700' }}
        >
          Zingo Delegator
        </Text>
        <Text style={{ color: colors.fgMuted, fontSize: 16, marginTop: 4 }}>
          Brand manual. Dark only. One accent. Quiet by default.
        </Text>
      </View>

      <Section
        title="Voice"
        note="Short sentences. Name the action, not the feature. Never shout."
      >
        <Row>
          <View style={{ flex: 1, minWidth: 160, marginRight: 16 }}>
            <FadeText style={{ fontSize: 12 }}>Do</FadeText>
            <RegText>Send</RegText>
            <RegText>Stake 12 ZEC</RegText>
            <RegText>Not enough funds</RegText>
          </View>
          <View style={{ flex: 1, minWidth: 160 }}>
            <FadeText style={{ fontSize: 12 }}>Do not</FadeText>
            <RegText color={colors.fgSubtle}>Submit transaction!</RegText>
            <RegText color={colors.fgSubtle}>Delegate your assets</RegText>
            <RegText color={colors.fgSubtle}>
              Oops, something went wrong
            </RegText>
          </View>
        </Row>
      </Section>

      {GROUPS.map(g => (
        <Section key={g.title} title={g.title} note={g.note}>
          <Row>
            {g.tokens.map(t => (
              <Swatch key={t} name={t} />
            ))}
          </Row>
        </Section>
      ))}

      <Section
        title="Typography"
        note={`System font (${
          fontFamily.sans ?? 'SF Pro / Roboto'
        }). Apple text styles at the default size. Tracking follows size.`}
      >
        {TYPE_SCALE.map(name => (
          <View
            key={name}
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              marginBottom: 10,
            }}
          >
            <Text style={{ color: colors.fgSubtle, fontSize: 11, width: 110 }}>
              {name} · {text[name].fontSize}/{text[name].lineHeight} ·{' '}
              {text[name].fontWeight}
            </Text>
            <Text style={[text[name], { color: colors.fgDefault }]}>
              The quick brown fox
            </Text>
          </View>
        ))}
        <View style={{ marginTop: 12 }}>
          <BoldText>BoldText primitive</BoldText>
          <RegText>RegText primitive</RegText>
          <FadeText>FadeText primitive</FadeText>
          <ErrorText>ErrorText primitive</ErrorText>
          <Text style={[mono, { color: colors.fgDefault, marginTop: 6 }]}>
            u1qwerty…mono ({fontFamily.mono}) for addresses
          </Text>
        </View>
      </Section>

      <Section title="Amounts" note="ZEC first. Fiat is secondary and muted.">
        <ZecAmount
          amtZec={12.3456789}
          size={30}
          currencyName={CurrencyNameEnum.ZEC}
          privacy={false}
        />
        <CurrencyAmount
          amtZec={12.3456789}
          price={32.5}
          currency={CurrencyEnum.USDCurrency}
          privacy={false}
        />
        <View style={{ marginTop: 12 }}>
          <ZecAmount
            amtZec={12.3456789}
            size={18}
            currencyName={CurrencyNameEnum.ZEC}
            privacy={true}
          />
          <FadeText style={{ fontSize: 12 }}>
            Privacy mode hides digits
          </FadeText>
        </View>
      </Section>

      <Section
        title="Spacing"
        note="Multiples of 4. Screen padding is 20. Section gap is 32."
      >
        <Row>
          {SPACING.map(s => (
            <View key={s} style={{ alignItems: 'center', marginRight: 12 }}>
              <View
                style={{
                  width: s,
                  height: s,
                  backgroundColor: colors.bgAccent,
                  borderRadius: 2,
                }}
              />
              <Text
                style={{ color: colors.fgSubtle, fontSize: 11, marginTop: 4 }}
              >
                {s}
              </Text>
            </View>
          ))}
        </Row>
      </Section>

      <Section
        title="Radii"
        note="Values currently in use. Candidates for tokens."
      >
        <Row>
          {RADII.map(r => (
            <View key={r} style={{ alignItems: 'center', marginRight: 12 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: r,
                  backgroundColor: colors.bgSurface,
                  borderWidth: 1,
                  borderColor: colors.borderMuted,
                }}
              />
              <Text
                style={{ color: colors.fgSubtle, fontSize: 11, marginTop: 4 }}
              >
                {r}
              </Text>
            </View>
          ))}
        </Row>
      </Section>

      <Section
        title="Buttons"
        note="One primary per screen. Danger only for irreversible actions."
      >
        <View style={{ gap: 10 }}>
          <Button title="Primary" onPress={() => {}} />
          <Button title="Secondary" variant="secondary" onPress={() => {}} />
          <Button title="Ghost" variant="ghost" onPress={() => {}} />
          <Button title="Danger" variant="danger" onPress={() => {}} />
          <Button title="Disabled" disabled onPress={() => {}} />
          <Button title="Loading" loading onPress={() => {}} />
        </View>
      </Section>

      <Section
        title="Surfaces"
        note="Card on canvas. Status cards tint the whole card."
      >
        <View
          style={{
            backgroundColor: colors.bgSurface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <BoldText>Surface card</BoldText>
          <FadeText>Secondary text on a surface</FadeText>
        </View>
        <View
          style={{
            backgroundColor: colors.bgWarning,
            borderColor: colors.borderWarning,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: colors.fgWarningEmphasis, fontWeight: '700' }}>
            Warning title
          </Text>
          <Text style={{ color: colors.fgWarningMuted }}>
            Warning body text stays readable on the tinted card.
          </Text>
        </View>
        <View
          style={{
            borderColor: colors.borderDanger,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
          }}
        >
          <Text style={{ color: colors.fgDanger, fontWeight: '700' }}>
            Danger
          </Text>
          <FadeText>
            Outline only. No red fill except the danger button.
          </FadeText>
        </View>
      </Section>
    </ScrollView>
  );
};

export default BrandManual;
