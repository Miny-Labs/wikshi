export type SvgAnimationType =
  | 'tokenFlow'
  | 'lineDrawDiagram'
  | 'scoreGauge'
  | 'comparisonSplit'
  | 'poolFill'
  | 'healthGauge'
  | 'architectureDiagram'
  | 'mintBadge'
  | 'rwaFlow'
  | 'none';

export interface ContractLink {
  name: string;
  address: string;
}

export interface DemoStep {
  id: string;
  title: string;
  page: string;
  description: string;
  whatThisProves: string;
  narrativeNote?: string;
  targetSelector: string;
  dialogPosition: 'left' | 'right' | 'bottom' | 'center';
  contractLinks?: ContractLink[];
  svgAnimation: SvgAnimationType;
  svgProps?: Record<string, unknown>;
}

export const DEMO_STEPS: DemoStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Wikshi',
    page: '/app',
    description:
      'Wikshi is the first credit-native lending protocol on Creditcoin. Your repayment history — verified cross-chain via USC proofs — directly reduces collateral requirements and interest rates.',
    whatThisProves:
      'The dashboard aggregates data from WikshiLend, WikshiCreditSBT, WikshiOracle, and WikshiIrm to show your complete DeFi position across 16 deployed contracts.',
    targetSelector: '[data-demo="stat-cards"]',
    dialogPosition: 'bottom',
    svgAnimation: 'none',
  },
  {
    id: 'credit-identity',
    title: 'Soulbound Credit Identity',
    page: '/app/credit',
    description:
      'Each borrower mints a non-transferable ERC-5192 soulbound token that stores their credit score, trust tier, and payment history. Like a FICO score, but decentralized, transparent, and owned entirely by you.',
    whatThisProves:
      'WikshiCreditSBT.mint() creates a soulbound ERC-721. It pulls data from WikshiCreditOracle which ingests payment proofs from USC cross-chain verification, Creditcoin native events, and the Credal operator.',
    targetSelector: '[data-demo="sbt-action"]',
    dialogPosition: 'right',
    svgAnimation: 'mintBadge',
    contractLinks: [
      { name: 'WikshiCreditSBT', address: '0x5d232BE0b2c4E8fc120C2D545F7b7bDdfF577aB1' },
      { name: 'WikshiCreditOracle', address: '0x7002a4528B957Aa16F1a3187031b35DA08E81ECa' },
    ],
  },
  {
    id: 'credit-scoring',
    title: 'Credit Score Mechanics',
    page: '/app/credit',
    description:
      'Scores range from 0 to 1000. They increase with verified payments, decay at 1 point/day after 30 days of inactivity, and slash by 100 points on liquidation. Four progressive tiers: Unverified → Basic → Established → Trusted.',
    whatThisProves:
      'The credit oracle ingests events from three sources: USC cross-chain proofs (any EVM chain via 0x0FD2), Creditcoin native loan events (5M+ transactions), and off-chain Credal operator scoring.',
    narrativeNote:
      'In production, zkTLS (like Reclaim Protocol) can pull verified credit bureau data without exposing personal information.',
    targetSelector: '[data-demo="benefits-strip"]',
    dialogPosition: 'right',
    svgAnimation: 'scoreGauge',
    svgProps: { animated: true },
    contractLinks: [
      { name: 'WikshiCreditSBT', address: '0x5d232BE0b2c4E8fc120C2D545F7b7bDdfF577aB1' },
      { name: 'WikshiLend', address: '0x186b3Fc15a3404e043D0eb8ecfe0773b82018a73' },
      { name: 'WikshiIrm', address: '0xAbC2933B07C94bd4e3BB265B70Cea4f62B408fCa' },
    ],
  },
  {
    id: 'lending-pool',
    title: 'Providing Liquidity',
    page: '/app/lend',
    description:
      'Lenders supply USDT to isolated lending pools and earn interest from borrower repayments. The protocol uses an ERC-4626 vault with a 6-decimal offset for inflation attack protection.',
    whatThisProves:
      'WikshiLend.supply() deposits assets into an isolated market. Share-based accounting ensures proportional interest distribution. Supply caps prevent over-concentration.',
    targetSelector: '[data-demo="supply-card"]',
    dialogPosition: 'right',
    svgAnimation: 'tokenFlow',
    svgProps: { token: 'USDT', amount: '25,000', color: '#22C55E', direction: 'deposit' },
    contractLinks: [
      { name: 'WikshiLend', address: '0x186b3Fc15a3404e043D0eb8ecfe0773b82018a73' },
      { name: 'WikshiVault', address: '0xaf1Ac078595AA65498d14df5927e1c4bC2037Cf2' },
    ],
  },
  {
    id: 'credit-advantage',
    title: 'The Credit Advantage',
    page: '/app/borrow',
    description:
      'Here\'s the breakthrough: your credit score directly reduces collateral requirements. An Established-tier borrower (10+ verified payments) posts LESS collateral than someone with no credit history.',
    whatThisProves:
      'WikshiLend.effectiveLltv() calculates a higher LLTV based on credit tier. Established tier (score≥400, 10+ payments) gets +20% of the gap: 80% → 84% LLTV, reducing collateral from 125% to 119%.',
    narrativeNote:
      'This is Gen 2 DeFi Lending — where reputation earns real economic benefits on-chain, just like traditional finance but transparent and programmable.',
    targetSelector: '[data-demo="comparison-panel"]',
    dialogPosition: 'right',
    svgAnimation: 'comparisonSplit',
    svgProps: {},
    contractLinks: [
      { name: 'WikshiLend', address: '0x186b3Fc15a3404e043D0eb8ecfe0773b82018a73' },
    ],
  },
  {
    id: 'borrowing',
    title: 'Collateralize & Borrow',
    page: '/app/borrow',
    description:
      'Deposit WCTC as collateral, then borrow USDT against it. The lending pool checks your effective LLTV — credit-boosted borrowers need less collateral for the same loan.',
    whatThisProves:
      'Three contract calls: approve collateral token, supplyCollateral(), then borrow(). The Morpho Blue singleton handles isolated markets, each with its own oracle, IRM, and LLTV parameters.',
    targetSelector: '[data-demo="borrow-form"]',
    dialogPosition: 'left',
    svgAnimation: 'tokenFlow',
    svgProps: { token: 'WCTC', amount: '5,000', color: '#c8b6f0', direction: 'collateral' },
  },
  {
    id: 'health-factor',
    title: 'Health Monitor',
    page: '/app/borrow',
    description:
      'Your health factor shows how safe your position is. Above 1.0 = safe. Below 1.0 = liquidation risk. Credit scores give you more headroom before liquidation.',
    whatThisProves:
      'WikshiLend.isHealthy() checks your position against the effective LLTV (not base LLTV). Credit-boosted users have a wider safety margin. Liquidation triggers -100 score slashing.',
    targetSelector: '[data-demo="health-section"]',
    dialogPosition: 'left',
    svgAnimation: 'healthGauge',
    svgProps: {},
  },
  {
    id: 'rwa-pipeline',
    title: 'Real-World Assets',
    page: '/app/rwa',
    description:
      'Real-world loan receivables — from Gluwa\'s Loan.sol and Creditcoin\'s Credal-powered loan cycles — are tokenized as ERC-721 NFTs, wrapped into fungible wREC ERC-20 tokens, and used as DeFi collateral.',
    whatThisProves:
      'Four contracts form the pipeline: WikshiReceivable (ERC-721 tokenization), WikshiReceivableWrapper (NFT→ERC-20), WikshiReceivableOracle (credit-adjusted DCF pricing), and WikshiLiquidationRouter (atomic liquidation).',
    narrativeNote:
      'In production, minting is triggered after USC cross-chain verification confirms a real loan was funded on the source chain.',
    targetSelector: '[data-demo="mint-receivable-card"]',
    dialogPosition: 'right',
    svgAnimation: 'rwaFlow',
    svgProps: { step: 'mint' },
    contractLinks: [
      { name: 'WikshiReceivable', address: '0x009BA23B690152c22F3c80d790CAF3673F223a18' },
      { name: 'wREC Wrapper', address: '0x7989045AC4c05D6002600CEa6107db5049f3506b' },
      { name: 'RWA Oracle', address: '0x24F574B945F8D74358098F9919f8d64eF247FBaD' },
      { name: 'Liquidation Router', address: '0x9D9ab114B3D336319d08dB235c501Ac23C72dcFF' },
    ],
  },
  {
    id: 'markets-overview',
    title: 'Lending Markets',
    page: '/app/markets',
    description:
      'Two isolated markets powered by Morpho Blue architecture: WCTC/USDT for crypto collateral lending, and wREC/USDT for real-world asset-backed borrowing. Each market has its own oracle, IRM, and risk parameters.',
    whatThisProves:
      'WikshiLend singleton manages infinite isolated markets. Market 1: WCTC/USDT at 80% base LLTV. Market 2: wREC/USDT at 70% LLTV (more conservative for RWA). Both share the same kink-based IRM.',
    targetSelector: '[data-demo="contracts-section"]',
    dialogPosition: 'center',
    svgAnimation: 'rwaFlow',
    svgProps: { step: 'market' },
    contractLinks: [
      { name: 'WikshiLend', address: '0x186b3Fc15a3404e043D0eb8ecfe0773b82018a73' },
      { name: 'wREC (Wrapper)', address: '0x7989045AC4c05D6002600CEa6107db5049f3506b' },
      { name: 'RWA Oracle', address: '0x24F574B945F8D74358098F9919f8d64eF247FBaD' },
    ],
  },
  {
    id: 'dashboard-portfolio',
    title: 'Your Portfolio',
    page: '/app',
    description:
      'The dashboard shows your complete DeFi position — supplied assets, borrowed amounts, collateral value, and credit score. All powered by 16 smart contracts working in harmony.',
    whatThisProves:
      'This single view queries WikshiLend, WikshiCreditSBT, WikshiOracle, WikshiIrm, and WikshiReceivable simultaneously to present a unified financial picture.',
    targetSelector: '[data-demo="stat-cards"]',
    dialogPosition: 'bottom',
    svgAnimation: 'none',
    contractLinks: [
      { name: 'WikshiLend', address: '0x186b3Fc15a3404e043D0eb8ecfe0773b82018a73' },
      { name: 'CreditSBT', address: '0x5d232BE0b2c4E8fc120C2D545F7b7bDdfF577aB1' },
      { name: 'WikshiOracle', address: '0xa5f8E4e9a07F3Ca8f32e16E526810C8E7FBcdff6' },
      { name: 'WikshiIrm', address: '0xAbC2933B07C94bd4e3BB265B70Cea4f62B408fCa' },
    ],
  },
  {
    id: 'architecture',
    title: 'On-Chain Architecture',
    page: '/app',
    description:
      '16 deployed contracts. Every transaction verified on Blockscout. From price oracles to credit scoring to RWA receivables — a complete credit-native DeFi protocol built on Creditcoin.',
    whatThisProves:
      'All 16 contracts are deployed and verified on Creditcoin USC Testnet v2 (Chain ID 102036). Architecture follows the Morpho Blue pattern — one contract, infinite isolated markets, permissionless composition.',
    narrativeNote:
      'Wikshi Protocol proves that credit-native lending is not just possible on Creditcoin — it\'s the natural evolution of the chain\'s 11.86M credit transactions. From crypto collateral to real-world receivables, all on one chain.',
    targetSelector: '[data-demo="contracts-section"]',
    dialogPosition: 'right',
    svgAnimation: 'architectureDiagram',
    contractLinks: [
      { name: 'WikshiLend', address: '0x186b3Fc15a3404e043D0eb8ecfe0773b82018a73' },
      { name: 'CreditOracle', address: '0x7002a4528B957Aa16F1a3187031b35DA08E81ECa' },
      { name: 'CreditSBT', address: '0x5d232BE0b2c4E8fc120C2D545F7b7bDdfF577aB1' },
      { name: 'WikshiOracle', address: '0xa5f8E4e9a07F3Ca8f32e16E526810C8E7FBcdff6' },
      { name: 'WikshiIrm', address: '0xAbC2933B07C94bd4e3BB265B70Cea4f62B408fCa' },
      { name: 'WikshiVault', address: '0xaf1Ac078595AA65498d14df5927e1c4bC2037Cf2' },
      { name: 'Multicall', address: '0x404a45a33E7bDf066D7DF7d8e56Ec9b0eEad5005' },
      { name: 'WCTC', address: '0x9A1F674108286906cDB25CfbF7Bd538131492435' },
      { name: 'USDT', address: '0x2BA65253Fc2c20fdfaa1FA5EE13bDA57cfDBC30F' },
      { name: 'USDT (RWA)', address: '0x04D24009A7E3784ba042E932B09201f86cBa16ee' },
      { name: 'Receivable', address: '0x009BA23B690152c22F3c80d790CAF3673F223a18' },
      { name: 'wREC Wrapper', address: '0x7989045AC4c05D6002600CEa6107db5049f3506b' },
      { name: 'RWA Oracle', address: '0x24F574B945F8D74358098F9919f8d64eF247FBaD' },
      { name: 'Liquidator', address: '0x9D9ab114B3D336319d08dB235c501Ac23C72dcFF' },
      { name: 'Payments', address: '0x1A978Ce96f3c52E8cd7e6bdCB66ECc4BcF7f96a7' },
    ],
  },
];

export const TOTAL_STEPS = DEMO_STEPS.length;

export function getStepNumber(index: number): number {
  return index + 1;
}
