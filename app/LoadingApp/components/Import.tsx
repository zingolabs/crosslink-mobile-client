import React, { useContext, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { ToastProvider, useToast } from 'react-native-toastier';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContextAppLoading } from '../../context';
import { ScreenEnum, SelectServerEnum } from '../../AppState';
import Snackbars from '../../../components/Components/Snackbars';
import { HeaderTitle } from '../../../components/Header';
import LiquidPrimaryButton from '../../../components/Components/LiquidButton/LiquidPrimaryButton';
import { radiusPill, text, useTheme } from '../../theme';
import { checksumOk } from '../seed/checksum';
import {
  SEED_LENGTH,
  cleanHeight,
  exactOnly,
  isSeedWord,
  parsePhrase,
  suggest,
  tokenize,
} from '../seed/seed';
import SeedChip from './SeedChip';

type ImportProps = {
  actionButtonsDisabled: boolean;
  onClickCancel: () => void;
  onClickOK: (keyText: string, birthday: number) => void;
};

type Batch = { start: number; count: number };

const Import: React.FunctionComponent<ImportProps> = ({
  actionButtonsDisabled,
  onClickCancel,
  onClickOK,
}) => {
  const context = useContext(ContextAppLoading);
  const {
    translate,
    netInfo,
    addLastSnackbar,
    selectIndexerServer,
    snackbars,
    removeFirstSnackbar,
  } = context;
  const { colors } = useTheme();
  const { clear } = useToast();
  const insets = useSafeAreaInsets();
  const screenName = ScreenEnum.Import;

  const inputRef = useRef<TextInput>(null);
  const fieldScroll = useRef<ScrollView>(null);
  const [words, setWords] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const editRef = useRef<{ index: number; draft: string } | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [focused, setFocused] = useState(false);
  const [birthday, setBirthday] = useState('');

  const full = words.length >= SEED_LENGTH && editing === null;
  const options = useMemo(
    () => (full || !draft ? [] : suggest(draft, 3)),
    [full, draft],
  );
  const draftInvalid = draft.length >= 4 && options.length === 0;
  const allIn = words.length === SEED_LENGTH && editing === null && !draft;
  const wrong = words.filter(w => !isSeedWord(w)).length;
  const sumOk = allIn && wrong === 0 && checksumOk(words);

  const commitMany = (incoming: string[], trailing = '') => {
    if (incoming.length === 0) {
      setDraft(trailing);
      return;
    }
    let next = [...words];
    const active = editRef.current;
    const start = active ? active.index : words.length;
    if (active) {
      editRef.current = null;
      next.splice(active.index, 1, ...incoming);
    } else {
      next = next.concat(incoming);
    }
    if (next.length > SEED_LENGTH) {
      const spill = next[SEED_LENGTH];
      if (/^\d+$/.test(spill)) {
        setBirthday(spill);
      }
      next = next.slice(0, SEED_LENGTH);
    }
    setWords(next);
    setEditing(null);
    setDraft(trailing);
    setBatch({ start, count: Math.min(incoming.length, SEED_LENGTH - start) });
  };

  const onChangeText = (raw: string) => {
    if (/\s/.test(raw)) {
      const parsed = parsePhrase(raw);
      if (parsed.birthday) {
        setBirthday(parsed.birthday);
      }
      const tokens = tokenize(raw);
      const trailing = /\s$/.test(raw) ? '' : (tokens.pop() ?? '');
      commitMany(tokens.slice(0, SEED_LENGTH), trailing);
      return;
    }
    const clean = raw.toLowerCase();
    if (exactOnly(clean)) {
      commitMany([clean]);
      return;
    }
    setDraft(clean);
  };

  const onSubmit = () => {
    if (draft) {
      commitMany([options[0] ?? draft]);
    }
  };

  const onKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key !== 'Backspace' || draft || editing !== null) {
      return;
    }
    if (words.length === 0) {
      return;
    }
    setDraft(words[words.length - 1]);
    setWords(words.slice(0, -1));
    setBatch(null);
  };

  const edit = (i: number) => {
    editRef.current = { index: i, draft: words[i] };
    setEditing(i);
    setEditDraft(words[i]);
  };

  const onChangeEdit = (raw: string) => {
    if (/\s/.test(raw)) {
      const tokens = tokenize(raw);
      if (tokens.length === 0) {
        setEditDraft('');
        return;
      }
      commitMany(tokens.slice(0, SEED_LENGTH));
      return;
    }
    const clean = raw.toLowerCase();
    if (exactOnly(clean)) {
      commitMany([clean]);
      return;
    }
    if (editRef.current) {
      editRef.current = { ...editRef.current, draft: clean };
    }
    setEditDraft(clean);
  };

  const finishEdit = () => {
    const active = editRef.current;
    if (!active) {
      return;
    }
    const clean = active.draft.trim();
    if (clean) {
      commitMany([clean]);
      return;
    }
    editRef.current = null;
    setWords(words.filter((_, i) => i !== active.index));
    setEditing(null);
    setBatch(null);
  };

  const pasteFromClipboard = async () => {
    const raw = await Clipboard.getString();
    if (parsePhrase(raw).words.length < 2) {
      return;
    }
    onChangeText(`${raw.trim()} `);
  };

  const okButton = () => {
    if (
      !netInfo.isConnected ||
      selectIndexerServer === SelectServerEnum.offline
    ) {
      addLastSnackbar({
        message: translate('loadedapp.connection-error') as string,
        screenName: [screenName],
      });
      return;
    }
    Keyboard.dismiss();
    onClickOK(words.join(' '), Number(birthday || 0));
  };

  const checksumFailed = allIn && wrong === 0 && !sumOk;

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: colors.bgCanvas }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <HeaderTitle
          title="Import wallet"
          goBack={() => {
            clear();
            onClickCancel();
          }}
          ExtraComponent={
            <Pressable
              onPress={pasteFromClipboard}
              disabled={actionButtonsDisabled}
              hitSlop={10}
              style={({ pressed }) => [
                styles.navButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Paste phrase"
            >
              <Text style={[styles.navText, { color: colors.fgAccent }]}>
                Paste
              </Text>
            </Pressable>
          }
        />

        <View style={styles.content}>
          <Pressable
            onPress={() => inputRef.current?.focus()}
            disabled={full}
            accessible={false}
          >
            <View
              style={[
                styles.field,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: checksumFailed
                    ? colors.borderDanger
                    : focused
                      ? colors.borderSubtle
                      : colors.bgSurface,
                },
              ]}
            >
              <ScrollView
                ref={fieldScroll}
                style={styles.fieldScroll}
                contentContainerStyle={styles.fieldContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => {
                  if (editing === null) {
                    fieldScroll.current?.scrollToEnd({ animated: true });
                  }
                }}
              >
                <View style={styles.row}>
                  {words.map((word, i) => (
                    <SeedChip
                      key={i}
                      index={i}
                      word={word}
                      invalid={!isSeedWord(word)}
                      entrance={
                        !!batch &&
                        i >= batch.start &&
                        i < batch.start + batch.count
                      }
                      editing={editing === i}
                      draft={editing === i ? editDraft : ''}
                      disabled={actionButtonsDisabled}
                      onPress={() => edit(i)}
                      onChangeDraft={onChangeEdit}
                      onSubmit={finishEdit}
                      onBlur={finishEdit}
                      onBackspaceEmpty={() => undefined}
                    />
                  ))}
                  <TextInput
                    ref={inputRef}
                    testID="import.seedinput"
                    value={draft}
                    onChangeText={onChangeText}
                    onKeyPress={onKeyPress}
                    onSubmitEditing={onSubmit}
                    selectionColor={colors.fgMuted}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    submitBehavior="submit"
                    placeholderTextColor={colors.fgFaint}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    autoComplete="off"
                    textContentType="none"
                    importantForAutofill="no"
                    keyboardType={
                      Platform.OS === 'android' ? 'visible-password' : 'default'
                    }
                    returnKeyType="next"
                    autoFocus
                    editable={!actionButtonsDisabled && !full}
                    style={[
                      styles.input,
                      full && styles.inputHidden,
                      {
                        color: draftInvalid
                          ? colors.fgDanger
                          : colors.fgDefault,
                      },
                    ]}
                    accessibilityLabel={
                      editing !== null
                        ? `Word ${editing + 1}`
                        : `Word ${words.length + 1} of ${SEED_LENGTH}`
                    }
                  />
                </View>
              </ScrollView>
            </View>
          </Pressable>

          {options.length > 0 ? (
            <View style={styles.options}>
              {options.map((o, i) => (
                <Pressable
                  key={o}
                  onPress={() => commitMany([o])}
                  disabled={actionButtonsDisabled}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor:
                        i === 0 ? colors.borderSubtle : colors.borderFaint,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Use ${o}`}
                >
                  <Text style={[styles.optionText, { color: colors.fgSubtle }]}>
                    <Text style={{ color: colors.fgDefault }}>{draft}</Text>
                    {o.slice(draft.length)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : checksumFailed ? (
            <Text style={[styles.note, { color: colors.fgDanger }]}>
              Checksum failed
            </Text>
          ) : null}

          <View
            style={[
              styles.birthdayField,
              { backgroundColor: colors.bgSurface },
            ]}
          >
            <Text style={[styles.birthdayLabel, { color: colors.fgSubtle }]}>
              Birthday
            </Text>
            <TextInput
              testID="import.birthdayinput"
              value={birthday}
              onChangeText={t => {
                setBirthday(cleanHeight(t));
              }}
              placeholder="0"
              placeholderTextColor={colors.fgFaint}
              keyboardType="number-pad"
              selectionColor={colors.fgMuted}
              editable={!actionButtonsDisabled}
              style={[styles.birthdayInput, { color: colors.fgDefault }]}
              accessibilityLabel={translate('import.birthday-acc') as string}
            />
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <View testID="import.button.ok">
            <LiquidPrimaryButton
              title={translate('continue') as string}
              disabled={actionButtonsDisabled || !sumOk}
              onPress={() => {
                clear();
                okButton();
              }}
              style={styles.cta}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  field: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 124,
    flexShrink: 1,
  },
  fieldScroll: { flexGrow: 0, flexShrink: 1 },
  fieldContent: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  input: {
    ...text.body,
    fontWeight: '500',
    flexGrow: 1,
    minWidth: 96,
    height: 34,
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  inputHidden: { height: 0, minWidth: 0, flexGrow: 0 },
  options: { flexDirection: 'row', gap: 8 },
  option: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radiusPill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  optionText: { ...text.body },
  note: { ...text.footnote, paddingHorizontal: 4 },
  birthdayField: {
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  birthdayLabel: { ...text.body },
  birthdayInput: {
    ...text.body,
    fontVariant: ['tabular-nums'],
    flex: 1,
    textAlign: 'right',
    padding: 0,
  },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
  cta: { alignSelf: 'stretch' },
  navButton: { height: 44, justifyContent: 'center', paddingHorizontal: 4 },
  navText: { ...text.body },
  pressed: { opacity: 0.4 },
});

export default Import;
