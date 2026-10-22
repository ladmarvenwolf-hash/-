export type Side = 'sell' | 'buy';

export interface Offer {
  id?: string;
  server: string;
  item: string;
  stall: string;
  price: number;
  side: Side;
  updated: string;
}

export interface Deal {
  id: string;
  item: string;
  server: string;
  cheap: Offer;
  buyer: Offer;
  net: number;
  profit: number;
  roi: number;
}
