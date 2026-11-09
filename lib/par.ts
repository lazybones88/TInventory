import { qtyAmount } from "./qty";

export function afterPrep(onHand: unknown, madeToday: unknown) {
  return qtyAmount(onHand) + qtyAmount(madeToday);
}

export function exceedsPar(par: number, onHand: unknown, madeToday: unknown) {
  return (Number(par) || 0) > 0 && afterPrep(onHand, madeToday) > Number(par);
}
