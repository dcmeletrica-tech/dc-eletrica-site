export interface HoursBreakdown {
  macros: number;
  pages: number;
  threeD: number;
  engineering: number;
  total: number;
}

export interface PricingResult {
  hours: HoursBreakdown;
  baseTecnica: number;
  custosAdicionais: number;
  subtotalBase: number;
  reservaValor: number;
  baseComReserva: number;
  precoSugerido: number;
  descontoValor: number;
  precoFinal: number;
  tributosSobreFinal: number;
  saldoSobreBase: number;
  margemSobreBase: number;
  valid: boolean;
  error: string | null;
}
