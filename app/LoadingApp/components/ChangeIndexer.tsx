/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  ActivityIndicator,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeType } from '../../types';
import { ChainNameEnum, GlobalConst, ScreenEnum } from '../../AppState';
import { ContextAppLoading } from '../../context';
import { ToastProvider, useToast } from 'react-native-toastier';
import Snackbars from '../../../components/Components/Snackbars';
import RegText from '../../../components/Components/RegText';
import FadeText from '../../../components/Components/FadeText';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { serverUris } from '../../uris';
import { faCheck, faWarning } from '@fortawesome/free-solid-svg-icons';
import XIcon from '../../../assets/icons/x.svg';
import LiquidPrimaryButton from '../../../components/Components/LiquidButton/LiquidPrimaryButton';
import { HeaderTitle } from '../../../components/Header';

function parseUri(uri?: string) {
  if (!uri) return { base: '', port: '' };

  try {
    const url = new URL(uri);

    return {
      base: `${url.protocol}//${url.hostname}`,
      port: url.port,
    };
  } catch {
    return { base: '', port: '' };
  }
}

type ChangeIndexerProps = {
  actionButtonsDisabled: boolean;
  setIndexerServer: (u: string, c: ChainNameEnum) => Promise<void>;
  checkIndexerServer: (
    indexerServerUri: string,
    indexerServerChainName: ChainNameEnum,
  ) => Promise<{ result: boolean; indexerServerUriParsed: string }>;
  closeServers: () => void;
  chainName: ChainNameEnum;
  onBack: () => void;
};

export function ChangeIndexer({
  actionButtonsDisabled,
  setIndexerServer,
  checkIndexerServer,
  closeServers,
  chainName,
  onBack,
}: ChangeIndexerProps) {
  const context = useContext(ContextAppLoading);
  const {
    translate,
    snackbars,
    removeFirstSnackbar,
    indexerServer: indexerServerContext,
  } = context;

  const { colors } = useTheme() as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.Servers;
  const insets = useSafeAreaInsets();

  console.log('CHAIN NAME', chainName);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [borderColor, setBorderColor] = useState<string>('transparent');
  const [kbOpen, setKbOpen] = useState(false);

  const custom =
    serverUris().filter(s => s.uri === indexerServerContext.uri).length === 0;

  const { base, port } = parseUri(indexerServerContext.uri);

  const initialUri = useMemo(() => {
    if (custom) return base;
    return '';
  }, [custom, base]);

  const initialPort = useMemo(() => {
    if (custom) return port;
    return chainName === ChainNameEnum.regtestChainName ? '18234' : '';
  }, [custom, port, chainName]);

  const [indexerServerUriLocal, setIndexerServerUriLocal] =
    useState<string>(initialUri);
  const [indexerServerPortLocal, setIndexerServerPortLocal] =
    useState<string>(initialPort);
  const [indexerServerChainNameLocal] = useState<ChainNameEnum>(chainName);

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const s2 = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));

    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  const getChainName = (chain: ChainNameEnum) => {
    return !chain
      ? '-'
      : chain === ChainNameEnum.mainChainName
        ? 'mainnet'
        : chain === ChainNameEnum.testChainName
          ? 'testnet'
          : chain === ChainNameEnum.regtestChainName
            ? 'regtest'
            : `${translate('info.unknown') as string} (${chain})`;
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <KeyboardAvoidingView
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? insets.top : kbOpen ? insets.top : 0
        }
      >
        <HeaderTitle
          title="Connect to indexer"
          goBack={() => {
            clear();
            onBack();
          }}
        />

        <View
          style={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingBottom: insets.bottom + 8,
            paddingHorizontal: 27,
          }}
        >
          <FadeText
            style={{
              marginTop: 14,
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: -0.43,
              marginBottom: 58,
            }}
          >
            {`Enter your ${getChainName(indexerServerChainNameLocal)} indexer's details`}
          </FadeText>

          <View
            style={{
              justifyContent: 'flex-start',
              borderColor: '#494444',
              borderWidth: 1,
              borderRadius: 15,
              backgroundColor: '#151414',
              width: '100%',
              minWidth: '50%',
              alignItems: 'center',
              paddingHorizontal: 30,
              paddingVertical: 25,
            }}
          >
            <FadeText
              style={{
                marginLeft: 4,
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 22,
                marginBottom: 7,
                alignSelf: 'flex-start',
              }}
            >
              Indexer address
            </FadeText>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-start',
                borderColor: '#494444',
                borderWidth: 1,
                borderRadius: 12,
                marginBottom: 10,
                backgroundColor: '#181717',
                width: '100%',
                minWidth: '50%',
                height: 44,
                alignItems: 'center',
                paddingHorizontal: 16,
              }}
            >
              <TextInput
                placeholder="127.0.0.1 or localhost"
                placeholderTextColor={colors.placeholder}
                style={{
                  flexGrow: 1,
                  flexShrink: 1,
                  color: colors.text,
                  fontWeight: '400',
                  fontSize: 17,
                  paddingVertical: 0,
                  marginLeft: 4,
                  backgroundColor: 'transparent',
                }}
                value={indexerServerUriLocal}
                onChangeText={text => {
                  setConnected(null);
                  setBorderColor(colors.primary);
                  setIndexerServerUriLocal(text);
                }}
                editable={!actionButtonsDisabled}
                maxLength={100}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onFocus={() => {
                  if (connected === null) {
                    setBorderColor(colors.primary);
                  }
                }}
                onBlur={() => {
                  if (connected === null) {
                    setBorderColor('transparent');
                  }
                }}
              />

              {!!indexerServerUriLocal && (
                <TouchableOpacity
                  disabled={actionButtonsDisabled}
                  onPress={() => {
                    Keyboard.dismiss();
                    setIndexerServerUriLocal('');
                    setBorderColor('transparent');
                    setConnected(null);
                  }}
                >
                  <View
                    style={{
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: colors.zingo,
                      borderRadius: 11,
                      height: 22,
                      width: 22,
                    }}
                  >
                    <XIcon color={colors.background} width={20} height={20} />
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <FadeText
              style={{
                marginLeft: 4,
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 22,
                marginBottom: 7,
                alignSelf: 'flex-start',
              }}
            >
              Port
            </FadeText>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-start',
                borderColor: '#494444',
                borderWidth: 1,
                borderRadius: 12,
                marginBottom: 10,
                backgroundColor: '#181717',
                width: '100%',
                minWidth: '50%',
                height: 44,
                alignItems: 'center',
                paddingHorizontal: 16,
              }}
            >
              <TextInput
                placeholder={
                  chainName === ChainNameEnum.regtestChainName
                    ? 'e.g. 18234'
                    : 'e.g. 9067'
                }
                placeholderTextColor={colors.placeholder}
                style={{
                  flexGrow: 1,
                  flexShrink: 1,
                  color: colors.text,
                  fontWeight: '400',
                  fontSize: 17,
                  paddingVertical: 0,
                  marginLeft: 4,
                  backgroundColor: 'transparent',
                }}
                value={indexerServerPortLocal}
                onChangeText={text => {
                  setConnected(null);
                  setBorderColor(colors.primary);
                  setIndexerServerPortLocal(text);
                }}
                editable={!actionButtonsDisabled}
                maxLength={100}
                keyboardType="numeric"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onFocus={() => {
                  if (connected === null) {
                    setBorderColor(colors.primary);
                  }
                }}
                onBlur={() => {
                  if (connected === null) {
                    setBorderColor('transparent');
                  }
                }}
              />

              {!!indexerServerPortLocal && (
                <TouchableOpacity
                  disabled={actionButtonsDisabled}
                  onPress={() => {
                    Keyboard.dismiss();
                    setIndexerServerPortLocal('');
                    setBorderColor('transparent');
                    setConnected(null);
                  }}
                >
                  <View
                    style={{
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: colors.zingo,
                      borderRadius: 11,
                      height: 22,
                      width: 22,
                    }}
                  >
                    <XIcon color={colors.background} width={20} height={20} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              marginBottom: 4,
              minWidth: 48,
              minHeight: 48,
              gap: 10,
              marginLeft: 20,
            }}
          >
            {actionButtonsDisabled && (
              <ActivityIndicator size="small" color={colors.text} />
            )}
            {connected !== null && connected && (
              <FontAwesomeIcon size={20} icon={faCheck} color={borderColor} />
            )}
            {connected !== null && !connected && (
              <FontAwesomeIcon size={20} icon={faWarning} color={borderColor} />
            )}
            <RegText color={actionButtonsDisabled ? colors.text : borderColor}>
              {actionButtonsDisabled
                ? 'Connecting...'
                : connected === null
                  ? ''
                  : connected
                    ? 'Connected'
                    : 'Could not connect to indexer'}
            </RegText>
          </View>
        </View>

        <View
          style={{
            marginTop: 'auto',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 10,
            paddingBottom: 20,
            paddingHorizontal: 20,
          }}
        >
          {connected ? (
            <LiquidPrimaryButton
              title="Continue"
              onPress={() => {
                setIndexerServer(
                  `${indexerServerUriLocal}:${indexerServerPortLocal}`,
                  indexerServerChainNameLocal,
                );
                Keyboard.dismiss();
                clear();
                setTimeout(() => {
                  closeServers();
                }, 100);
              }}
            />
          ) : (
            <LiquidPrimaryButton
              title={connected === null ? 'Test Connection' : 'Retry'}
              disabled={
                actionButtonsDisabled ||
                !indexerServerUriLocal ||
                !indexerServerPortLocal ||
                !indexerServerChainNameLocal ||
                indexerServerUriLocal.replace('://', '').includes(':')
              }
              onPress={async () => {
                setConnected(null);
                setBorderColor('transparent');

                const normalizedBase =
                  !indexerServerUriLocal
                    .toLowerCase()
                    .startsWith(GlobalConst.http) &&
                  !indexerServerUriLocal
                    .toLowerCase()
                    .startsWith(GlobalConst.https)
                    ? GlobalConst.http + '//' + indexerServerUriLocal
                    : indexerServerUriLocal;

                const {
                  result: _connected,
                  indexerServerUriParsed: _indexerServerUri,
                } = await checkIndexerServer(
                  `${normalizedBase}:${indexerServerPortLocal}`,
                  indexerServerChainNameLocal,
                );

                setConnected(_connected);

                const { base: parsedBase, port: parsedPort } =
                  parseUri(_indexerServerUri);

                setIndexerServerUriLocal(parsedBase);
                setIndexerServerPortLocal(parsedPort);

                setBorderColor(_connected ? '#0E9634' : '#ff383c');
                Keyboard.dismiss();
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </ToastProvider>
  );
}
