import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';
import { space } from '../theme/tokens';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ação destrutiva: botão vermelho. */
  destructive?: boolean;
}

interface DialogApi {
  /** Resolve true ao confirmar, false ao cancelar/fechar. */
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  /** Aviso com um botão "OK". */
  alert: (title: string, message?: string) => Promise<void>;
  /** Atalho para erros de mutação: alert('Não foi possível …', e.message). */
  showError: (title: string) => (e: Error) => void;
}

const DialogContext = createContext<DialogApi | null>(null);

type Pending =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'alert'; title: string; message?: string; resolve: () => void };

/** Diálogos com as cores do app (substitui Alert.alert, que usa o tema do Android). */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const current = useRef<Pending | null>(null);

  const open = (p: Pending) => {
    // Um diálogo por vez: se outro estava aberto, ele é resolvido como "cancelado".
    const prev = current.current;
    if (prev) {
      if (prev.kind === 'confirm') prev.resolve(false);
      else prev.resolve();
    }
    current.current = p;
    setPending(p);
  };

  const close = useCallback((result: boolean) => {
    const p = current.current;
    current.current = null;
    setPending(null);
    if (!p) return;
    if (p.kind === 'confirm') p.resolve(result);
    else p.resolve();
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (options) =>
        new Promise<boolean>((resolve) => open({ kind: 'confirm', options, resolve })),
      alert: (title, message) =>
        new Promise<void>((resolve) => open({ kind: 'alert', title, message, resolve })),
      showError: (title) => (e) => {
        void new Promise<void>((resolve) =>
          open({ kind: 'alert', title, message: e.message, resolve }),
        );
      },
    }),
    [],
  );

  const title = pending?.kind === 'confirm' ? pending.options.title : pending?.title;
  const message = pending?.kind === 'confirm' ? pending.options.message : pending?.message;

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Sheet visible={pending !== null} onClose={() => close(false)} title={title}>
        {message ? <AppText variant="muted">{message}</AppText> : null}
        {pending?.kind === 'confirm' ? (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                title={pending.options.cancelLabel ?? 'Cancelar'}
                onPress={() => close(false)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                kind={pending.options.destructive ? 'dangerSolid' : 'primary'}
                title={pending.options.confirmLabel ?? 'Confirmar'}
                onPress={() => close(true)}
              />
            </View>
          </View>
        ) : pending ? (
          <Button kind="primary" title="OK" onPress={() => close(true)} />
        ) : null}
      </Sheet>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog precisa estar dentro de <DialogProvider>');
  return ctx;
}
