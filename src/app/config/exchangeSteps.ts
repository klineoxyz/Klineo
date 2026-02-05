/**
 * Step-by-step guidance for connecting each exchange.
 * Used by ConnectExchangeModal. Origami-style: no IP steps.
 */

export interface ExchangeStep {
  label: string;
  text: string;
  linkText?: string;
  linkHref?: string;
  /** Secondary link (e.g. "Create account") */
  linkTextSecondary?: string;
  linkHrefSecondary?: string;
  /** Show screenshot placeholder */
  showScreenshot?: boolean;
  /** Checklist items */
  checklist?: string[];
  /** Checklist item that must NOT be enabled (warning) */
  checklistDoNot?: string;
  note?: string;
  warning?: string;
}

export type SupportedExchange = 'binance' | 'bybit';
export type ExchangeId = SupportedExchange | 'hyperliquid' | 'extended' | 'aster' | 'bingx' | 'bitget' | 'gate' | 'kucoin' | 'lighter' | 'mexc' | 'okx' | 'pacifica';

/** Display order for exchange selector row */
export const EXCHANGE_SELECTOR_ORDER: ExchangeId[] = [
  'hyperliquid',
  'extended',
  'aster',
  'binance',
  'bingx',
  'bitget',
  'bybit',
  'gate',
  'kucoin',
  'lighter',
  'mexc',
  'okx',
  'pacifica',
];

export const EXCHANGE_NAMES: Record<ExchangeId, string> = {
  hyperliquid: 'Hyperliquid',
  extended: 'Extended',
  aster: 'ASTER',
  binance: 'Binance',
  bingx: 'BingX',
  bitget: 'Bitget',
  bybit: 'Bybit',
  gate: 'Gate.io',
  kucoin: 'KuCoin',
  lighter: 'Lighter',
  mexc: 'MEXC',
  okx: 'OKX',
  pacifica: 'Pacifica',
};

export const EXCHANGE_STEPS: Record<SupportedExchange, ExchangeStep[]> = {
  binance: [
    {
      label: 'Step 1',
      text: 'You need to go to the API Management section',
      linkText: 'Binance API Management Page',
      linkHref: 'https://www.binance.com/en/my/settings/api-management',
      linkTextSecondary: 'Create account',
      linkHrefSecondary: 'https://accounts.binance.com/register',
      showScreenshot: false,
    },
    {
      label: 'Step 2',
      text: 'Before pressing Create API, deselect the option that auto-applies restrictions (follow the screenshot).',
      showScreenshot: true,
    },
    {
      label: 'Step 3',
      text: 'Click the yellow Create API button, select System Generated, and assign a custom name for your API key.',
      showScreenshot: false,
    },
    {
      label: 'Step 4',
      text: 'Select Edit restrictions and apply the following permissions',
      checklist: [
        'Enable Reading',
        'Enable Spot & Margin Trading (if you use it)',
        'Enable Futures (if you use it)',
      ],
      checklistDoNot: 'Never enable Withdrawals',
      showScreenshot: true,
    },
    {
      label: 'Step 5',
      text: 'Click Save to confirm your changes, then copy the API Key and Secret and paste them here.',
      showScreenshot: false,
    },
  ],
  bybit: [
    {
      label: 'Step 1',
      text: 'Go to the API Management section and click Create New Key',
      linkText: 'Bybit API Management Page',
      linkHref: 'https://www.bybit.com/app/user/api-management',
      linkTextSecondary: 'Create account',
      linkHrefSecondary: 'https://www.bybit.com/en-US/register',
      showScreenshot: false,
    },
    {
      label: 'Step 2',
      text: 'Select System-generated API Keys',
      showScreenshot: true,
    },
    {
      label: 'Step 3',
      text: 'Choose API transaction and provide a custom label for your API key',
      showScreenshot: true,
    },
    {
      label: 'Step 4',
      text: 'In API Key Permissions, choose Read-Write (not Read-Only)',
      showScreenshot: true,
    },
    {
      label: 'Step 5',
      text: 'Select only the permissions needed for trading and reading data.',
      checklist: [
        'Orders (Spot and/or Derivatives)',
        'Positions (Derivatives)',
        'Trade (Spot)',
        'Read account/balance endpoints',
      ],
      checklistDoNot: 'Do NOT enable Withdrawal',
      showScreenshot: true,
    },
    {
      label: 'Step 6',
      text: 'Press Submit to confirm changes, then copy API Key + Secret and paste them into Klineo.',
      showScreenshot: false,
    },
  ],
};

/** Exchanges with full backend support (create + verify). */
export const SUPPORTED_EXCHANGES: SupportedExchange[] = ['binance', 'bybit'];

export function isSupported(exchange: ExchangeId): exchange is SupportedExchange {
  return SUPPORTED_EXCHANGES.includes(exchange as SupportedExchange);
}
