'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// The actual wallet logic, moved here from the old lib/useWallet.ts. The
// bug that made this necessary: a header "Connect Wallet" button and
// ActivateFlow's own connect button were each calling useWallet()
// independently, which gives each caller its OWN useState -- connecting in
// one place would never show as connected in the other, even though both
// read the same window.ethereum. One provider, one source of truth, fixes
// that at the root instead of patching each caller.

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

interface WalletState {
  address: string | null;
  chainId: string | null;
  connecting: boolean;
  error: string | null;
}

interface WalletContextValue extends WalletState {
  onBsc: boolean;
  connect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    connecting: false,
    error: null,
  });

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setState((s) => ({ ...s, error: 'No injected wallet found (install MetaMask or Trust Wallet).' }));
      return;
    }
    setState((s) => ({ ...s, connecting: true, error: null }));
    try {
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      const chainId = (await window.ethereum.request({ method: 'eth_chainId' })) as string;
      setState({ address: accounts[0] ?? null, chainId, connecting: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, connecting: false, error: (err as Error).message ?? 'Connection rejected' }));
    }
  }, []);

  useEffect(() => {
    if (!window.ethereum?.on) return;
    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setState((s) => ({ ...s, address: accounts[0] ?? null }));
    };
    window.ethereum.on('accountsChanged', onAccountsChanged);
    return () => window.ethereum?.removeListener?.('accountsChanged', onAccountsChanged);
  }, []);

  // BSC testnet = 0x61, BSC mainnet = 0x38
  const onBsc = state.chainId === '0x61' || state.chainId === '0x38';

  return <WalletContext.Provider value={{ ...state, onBsc, connect }}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet() called outside <WalletProvider> -- check app/layout.tsx wraps the app.');
  }
  return ctx;
}
