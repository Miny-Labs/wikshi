import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { type Chain } from "viem";

export const creditcoinTestnet = {
  id: 102036,
  name: "Creditcoin USC Testnet v2",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.usc-testnet2.creditcoin.network"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://explorer.usc-testnet2.creditcoin.network",
    },
  },
} as const satisfies Chain;

export const config = createConfig({
  chains: [creditcoinTestnet],
  connectors: [
    injected({ target: "metaMask" }),
  ],
  transports: {
    [creditcoinTestnet.id]: http(),
  },
});
