/**
 * Step-by-step guidance for connecting each exchange.
 * Used by ConnectExchangeModal.
 */

export interface ExchangeStep {
  label: string;
  text: string;
  linkText?: string;
  linkHref?: string;
}

export type SupportedExchange = 'binance' | 'bybit';
export type ExchangeId = SupportedExchange | 'okx' | 'gate' | 'kucoin' | 'mexc' | 'bitget' | 'bingx' | 'wallet';

export const EXCHANGE_STEPS: Record<SupportedExchange, ExchangeStep[]> = {
  binance: [
    {
      label: 'Step 1',
      text: 'Go to the Binance API Management page.',
      linkText: 'Open Binance API Management',
      linkHref: 'https://www.binance.com/en/my/settings/api-management',
    },
    {
      label: 'Step 2',
      text: 'Click Create API, choose System Generated, and name your API key.',
    },
    {
      label: 'Step 3',
      text: 'Enable: Read, Spot & Margin Trading (optional), Futures (if needed). Do NOT enable Withdrawals.',
    },
    {
      label: 'Step 4',
      text: 'Save the API key and copy the API Key and Secret.',
    },
    {
      label: 'Step 5',
      text: 'Paste your API Key and Secret into the form and click Create Account.',
    },
  ],
  bybit: [
    {
      label: 'Step 1',
      text: 'Go to the Bybit API Management page.',
      linkText: 'Open Bybit API Management',
      linkHref: 'https://www.bybit.com/app/user/api-management',
    },
    {
      label: 'Step 2',
      text: 'Create API key with the Unified Trading Account. Name your key.',
    },
    {
      label: 'Step 3',
      text: 'Enable Contract (derivatives) and Read & Write. Do NOT enable Withdrawals.',
    },
    {
      label: 'Step 4',
      text: 'Save and copy the API Key and Secret.',
    },
    {
      label: 'Step 5',
      text: 'Paste your API Key and Secret into the form and click Create Account.',
    },
  ],
};

export const EXCHANGE_NAMES: Record<ExchangeId, string> = {
  binance: 'Binance',
  bybit: 'Bybit',
  okx: 'OKX',
  gate: 'Gate',
  kucoin: 'KuCoin',
  mexc: 'MEXC',
  bitget: 'Bitget',
  bingx: 'BingX',
  wallet: 'Wallet (DEX)',
};

/** Exchanges with full backend support (create + verify). */
export const SUPPORTED_EXCHANGES: SupportedExchange[] = ['binance', 'bybit'];

export function isSupported(exchange: ExchangeId): exchange is SupportedExchange {
  return SUPPORTED_EXCHANGES.includes(exchange as SupportedExchange);
}

/** Exchanges that require passphrase (e.g. OKX). */
export const EXCHANGES_REQUIRING_PASSPHRASE: ExchangeId[] = ['okx', 'kucoin'];
