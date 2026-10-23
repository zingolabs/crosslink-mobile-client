import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ValueTransferType } from '../../app/AppState';
import { RPCValueTransferStatusEnum as S } from '../../app/rpc/enums/RPCValueTransferStatusEnum';
import { Incoming, makeIncoming, seedTransfers } from './data';

export type FeedItem = ValueTransferType & {
  arrivedAt?: number;
  confirmedAt?: number;
};

export type Feed = {
  items: FeedItem[];
  push: (what: Incoming) => void;
  confirmNext: () => void;
  auto: boolean;
  setAuto: (on: boolean) => void;
  reset: () => void;
};

const CONFIRM_AFTER = 4200;

const nowSec = () => Math.floor(Date.now() / 1000);

export const isPending = (vt: ValueTransferType) => vt.confirmations === 0;

/**
 * A live transaction feed for the prototypes. New items arrive pending and
 * confirm on their own a few seconds later, so both moments can be watched.
 */
export const useFeed = (empty = false): Feed => {
  const [items, setItems] = useState<FeedItem[]>(() =>
    empty ? [] : seedTransfers(nowSec()),
  );
  const [auto, setAuto] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const confirm = useCallback((txid: string) => {
    setItems(list =>
      list.map(it =>
        it.txid === txid && isPending(it)
          ? {
              ...it,
              confirmations: 1,
              status: S.confirmed,
              confirmedAt: Date.now(),
            }
          : it,
      ),
    );
  }, []);

  const push = useCallback(
    (what: Incoming) => {
      const vt: FeedItem = {
        ...makeIncoming(what, nowSec()),
        arrivedAt: Date.now(),
      };
      setItems(list => [vt, ...list]);
      timers.current.push(setTimeout(() => confirm(vt.txid), CONFIRM_AFTER));
    },
    [confirm],
  );

  const confirmNext = useCallback(() => {
    setItems(list => {
      const target = [...list].reverse().find(isPending);
      return target
        ? list.map(it =>
            it.txid === target.txid
              ? {
                  ...it,
                  confirmations: 1,
                  status: S.confirmed,
                  confirmedAt: Date.now(),
                }
              : it,
          )
        : list;
    });
  }, []);

  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setItems(empty ? [] : seedTransfers(nowSec()));
  }, [empty]);

  useEffect(() => {
    if (!auto) {
      return;
    }
    const kinds: Incoming[] = ['receive', 'send', 'receive', 'stake'];
    let i = 0;
    const id = setInterval(() => {
      push(kinds[i % kinds.length]);
      i += 1;
    }, 3200);
    return () => clearInterval(id);
  }, [auto, push]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return useMemo(
    () => ({ items, push, confirmNext, auto, setAuto, reset }),
    [items, push, confirmNext, auto, reset],
  );
};
