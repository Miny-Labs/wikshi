// Market math helpers for Wikshi Protocol
// All BigInt arithmetic — matches Solidity precision

const WAD = 10n ** 18n;
const ORACLE_SCALE = 10n ** 36n;
const SECONDS_PER_YEAR = 365n * 24n * 3600n;

export function utilizationRate(totalSupply: bigint, totalBorrow: bigint): number {
  if (totalSupply === 0n) return 0;
  return Number((totalBorrow * WAD) / totalSupply) / 1e18;
}

export function perSecondToAPR(perSecondRate: bigint): number {
  return Number(perSecondRate * SECONDS_PER_YEAR) / 1e18 * 100;
}

export function effectiveLltvToCollateralRatio(effectiveLltv: bigint): number {
  if (effectiveLltv === 0n) return Infinity;
  return 1 / (Number(effectiveLltv) / 1e18);
}

export function collateralRatioPercent(effectiveLltv: bigint): number {
  return effectiveLltvToCollateralRatio(effectiveLltv) * 100;
}

export function maxBorrowUSD(
  collateralWei: bigint,
  oraclePrice: bigint,
  effectiveLltv: bigint,
  loanDecimals: number = 6,
): bigint {
  // collateral (18 dec) * price (36 dec scale) * lltv (18 dec) / (1e18 * 1e36)
  // Result in loan token decimals
  const numerator = collateralWei * oraclePrice * effectiveLltv;
  const denominator = WAD * ORACLE_SCALE;
  return numerator / denominator;
}

export function healthFactor(
  collateralWei: bigint,
  borrowAssets: bigint,
  oraclePrice: bigint,
  effectiveLltv: bigint,
): number {
  if (borrowAssets === 0n) return Infinity;
  // health = (collateral * price * lltv) / (borrow * 1e36)
  const collateralValue = collateralWei * oraclePrice * effectiveLltv;
  const borrowValue = borrowAssets * WAD * ORACLE_SCALE;
  return Number(collateralValue) / Number(borrowValue);
}

export function liquidationPrice(
  collateralWei: bigint,
  borrowAssets: bigint,
  effectiveLltv: bigint,
): bigint {
  // Price at which position gets liquidated
  // liqPrice = (borrowAssets * 1e36) / (collateral * lltv / 1e18)
  if (collateralWei === 0n || effectiveLltv === 0n) return 0n;
  return (borrowAssets * ORACLE_SCALE * WAD) / (collateralWei * effectiveLltv);
}

export function priceDrop(currentPrice: bigint, liqPrice: bigint): number {
  if (currentPrice === 0n) return 0;
  const drop = Number(currentPrice - liqPrice) / Number(currentPrice);
  return drop * 100; // percentage
}

export function formatWei(wei: bigint, decimals: number = 18): number {
  return Number(wei) / 10 ** decimals;
}

export function oraclePriceToUSD(price: bigint, loanDecimals: number = 6): number {
  // Oracle price is in 1e(36 + loanDecimals - collateralDecimals) scale
  // For WCTC(18) → USDT(6): scale = 1e(36+6-18) = 1e24
  // So price in USD = oraclePrice / 1e(36 - collateralDecimals + loanDecimals)
  return Number(price) / 10 ** (36 - 18 + loanDecimals);
}

export const GAS_CONFIG = {
  gasPrice: 1_000_000_000n,
  gas: 500_000n,
} as const;
