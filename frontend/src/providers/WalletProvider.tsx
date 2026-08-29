import React, { useMemo, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppKitProvider } from "@reown/appkit/react";
import { appKitConfig } from "../config/wagmi";

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  // Get theme from document class or default to dark
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    return document.documentElement.classList.contains("light") ? "light" : "dark";
  });

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isLight = document.documentElement.classList.contains("light");
      setTheme(isLight ? "light" : "dark");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);
  
  // Dynamically update AppKit config based on theme
  const dynamicAppKitConfig = useMemo(() => {
    const isLight = theme === "light";
    return {
      ...appKitConfig,
      themeMode: isLight ? "light" as const : "dark" as const,
      themeVariables: {
        ...appKitConfig.themeVariables,
        "--w3m-accent": isLight ? "#0071e3" : "#2997ff",
        "--w3m-background-color": isLight ? "#ffffff" : "#000000",
        "--w3m-color-bg-1": isLight ? "#ffffff" : "#1c1c1e",
        "--w3m-color-bg-2": isLight ? "#f5f5f7" : "#2c2c2e",
        "--w3m-color-fg-1": isLight ? "#1d1d1f" : "#ffffff",
        "--w3m-color-fg-2": isLight ? "#6e6e73" : "#86868b",
        "--w3m-color-overlay": isLight ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.6)",
      } as Record<string, string>,
    };
  }, [theme]);

  return (
    <AppKitProvider {...dynamicAppKitConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <appkit-modal />
      </QueryClientProvider>
    </AppKitProvider>
  );
};
