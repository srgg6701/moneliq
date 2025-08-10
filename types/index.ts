import { SVGProps } from 'react';

interface Currency {
  id: string;
  symbol: string;
  code: string;
}
interface Balance {
  id: string;
  currency_id: number;
  amount: string;
}
interface CombinedCurrencyData {
  currencyId: string;
  symbol: string;
  code: string;
  amount: string | null;
}

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export type { Currency, Balance, CombinedCurrencyData };
