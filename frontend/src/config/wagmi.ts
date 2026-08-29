import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { SOURCE_CHAINS, DEFAULT_DESTINATION_CHAINS, chains as catalogChains } from "../data/chains";
import { Chain } from "viem";

/** Wallet / AppKit only needs chains the user might switch to — not the full 1000-destination catalog. */
const walletChains = [
  ...SOURCE_CHAINS,
  ...DEFAULT_DESTINATION_CHAINS,
  ...catalogChains.filter((c) =>
    [
      "polygonAmoy",
      "zoraSepolia",
      "scrollSepolia",
      "avalancheFuji",
    ].includes(c.id)
  ),
].filter((c, i, arr) => arr.findIndex((x) => x.viemChain.id === c.viemChain.id) === i);

const allChains = walletChains
  .map((c) => c.viemChain)
  .filter((chain): chain is Chain => Boolean(chain));
// Ensure we have at least one chain (required by WagmiAdapter)
export const supportedChains: [Chain, ...Chain[]] =
  allChains.length > 0
    ? (allChains as [Chain, ...Chain[]])
    : ([SOURCE_CHAINS[0]?.viemChain].filter((chain): chain is Chain =>
        Boolean(chain)
      ) as [Chain, ...Chain[]]);

const projectId: string =
  import.meta.env.VITE_REOWN_PROJECT_ID || "39dcf1af67eaeecbcadff88f0ac1447d";

if (!projectId || projectId === "YOUR_PROJECT_ID") {
  console.warn(
    "⚠️ VITE_REOWN_PROJECT_ID is not set. Please add it to your .env file."
  );
}
// Convert chains to networks format for AppKit
type AppKitNetwork = {
  id: number;
  name: string;
  nativeCurrency: Chain["nativeCurrency"];
  rpcUrls: {
    default: {
      http: string[];
    };
  };
  blockExplorers?: Chain["blockExplorers"];
};

const networksArray: AppKitNetwork[] = supportedChains.map((chain) => ({
  id: chain.id,
  name: chain.name,
  nativeCurrency: chain.nativeCurrency,
  rpcUrls: {
    default: {
      http: [...chain.rpcUrls.default.http],
    },
  },
  blockExplorers: chain.blockExplorers,
}));

// Ensure networks is a non-empty tuple
const networks: [AppKitNetwork, ...AppKitNetwork[]] =
  networksArray.length > 0
    ? ([networksArray[0], ...networksArray.slice(1)] as [
        AppKitNetwork,
        ...AppKitNetwork[]
      ])
    : ([
        {
          id: 1,
          name: "Ethereum",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: { default: { http: ["https://eth.llamarpc.com"] } },
        },
      ] as [AppKitNetwork, ...AppKitNetwork[]]);

// Ensure we have valid chains and networks before creating adapter
if (supportedChains.length === 0) {
  throw new Error("No supported chains configured");
}

if (networks.length === 0) {
  throw new Error("No networks configured");
}

// Create WagmiAdapter with explicit config
export const wagmiAdapter = new WagmiAdapter({
  ssr: false,
  projectId,
  chains: supportedChains,
  networks,
});

/** Shared wagmi config — MUST be used by WagmiProvider so useAccount() sees AppKit connections */
export const appKitWagmiConfig = wagmiAdapter.wagmiConfig;

// Create AppKit config (to be used with AppKitProvider)
export const appKitConfig = {
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata: {
    name: "Gas Provider",
    description: "One deposit. Gas everywhere.",
    url: typeof window !== "undefined" ? window.location.origin : "",
    icons:
      typeof window !== "undefined"
        ? [`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⛽</text></svg>`]
        : [],
  },
  features: {
    analytics: true,
    email: false,
    socials: false as const,
  },
  enableNetworkView: true, // Enable network/chain switching
  enableAccountView: true, // Enable account view with chain switching
  enableOnramp: false, // Disable onramp for now
  themeMode: "dark" as const, // Will be overridden dynamically in WalletProvider
  themeVariables: {
    "--w3m-accent": "#2997ff",
    "--w3m-background-color": "#000000",
    "--w3m-container-border-radius": "16px",
  } as Record<string, string>,
};

// Create AppKit instance for programmatic access
export const appKit = createAppKit(appKitConfig);
