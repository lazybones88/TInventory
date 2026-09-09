export function afterPrep(onHand: number, madeToday: number) {
  return (Number(onHand) || 0) + (Number(madeToday) || 0);
}

export function exceedsPar(par: number, onHand: number, madeToday: number) {
  return (Number(par) || 0) > 0 && afterPrep(onHand, madeToday) > Number(par);
}
