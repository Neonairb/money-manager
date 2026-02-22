export const toDecimal = (value: number | string) => value.toString();
export const toNumber = (value: { toString: () => string }) =>
  Number(value.toString());
