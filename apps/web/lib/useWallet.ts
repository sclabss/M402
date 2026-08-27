'use client';

import { useCallback, useEffect, useState } from 'react';

// Deliberately dependency-light: talks to window.ethereum (EIP-1193) directly
// rather than pulling in wagmi/viem. Covers MetaMask / Trust Wallet / any
// injected BSC-compatible wallet, which is what "connect wallet, activate an
// agent, minimal friction" needs for a hackathon-scale marketplace. Swapping
// in wagmi later is a contained change -- it would replace this one file.

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

export function useWallet() {
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

  return { ...state, onBsc, connect };
}
