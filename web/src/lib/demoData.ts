// Realistic demo values for hackathon presentation when contracts return empty data
export const DEMO = {
  oraclePrice: 0.42,
  creditScore: 720,
  creditTier: 2,
  paymentCount: 14,
  hasSBT: true,
  lastSynced: Math.floor(Date.now() / 1000) - 300, // 5 min ago
  totalSupply: 125000,
  totalBorrow: 78000,
  fee: 5,
  collateral: 45000,
  wctcBalance: 2500,
  usdtBalance: 8400,
  nativeBalance: 150,
  userSupplied: 15000,
  userBorrowed: 8200,
  userCollateral: 25000,
} as const;

export function isEmptyData(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number' && value === 0) return true;
  if (typeof value === 'bigint' && value === 0n) return true;
  return false;
}
