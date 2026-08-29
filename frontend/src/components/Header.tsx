import React, { useState } from "react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import BalanceModal from "./BalanceModal";
import { PITCH_DECK_URL, DEMO_VIDEO_URL } from "../data/links";

const Header: React.FC = () => {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { theme, toggleTheme } = useTheme();
  const [isBalancesOpen, setIsBalancesOpen] = useState(false);

  const handleConnect = (): void => {
    if (isConnected) open({ view: "Account" });
    else open();
  };

  const handleSwitchNetwork = (): void => {
    if (isConnected) open({ view: "Networks" });
    else open();
  };

  const formatAddress = (addr: `0x${string}` | undefined): string => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="sticky top-0 z-50 -mx-4 border-b border-theme bg-white/85 px-4 py-3 backdrop-blur-xl dark:bg-[#24292E]/85 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="group flex cursor-pointer items-center gap-3 text-left"
          title="Go to home"
        >
          <img
            src="/flarelogo.png"
            alt="Flare"
            className="h-10 w-10 rounded-full object-cover transition-transform group-hover:scale-105"
          />
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-theme sm:text-2xl">
              Gas Provider
            </h1>
            <p className="text-xs font-medium text-secondary">
              Built on <span className="text-[#E62058]">flare</span>
            </p>
          </div>
        </button>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <a
            href={DEMO_VIDEO_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full border border-theme px-3 py-2 text-xs font-semibold text-secondary hover:border-[#E62058] hover:text-[#E62058] md:inline-flex"
          >
            Demo video
          </a>
          <a
            href={PITCH_DECK_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full border border-theme px-3 py-2 text-xs font-semibold text-secondary hover:border-[#E62058] hover:text-[#E62058] md:inline-flex"
          >
            Pitch deck
          </a>
          <a
            href="https://flare.network/"
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full border border-theme px-3 py-2 text-xs font-semibold text-secondary hover:border-[#E62058] hover:text-[#E62058] lg:inline-flex"
          >
            flare.network
          </a>
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative overflow-hidden rounded-full border border-theme bg-theme-muted p-2.5 text-theme"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={theme}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5 text-[#E46389]" />
                ) : (
                  <Moon className="h-5 w-5 text-[#24292E]" />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.button>
          <button
            onClick={() => setIsBalancesOpen(true)}
            className="rounded-full border border-theme bg-theme-muted px-4 py-2.5 text-sm font-medium text-theme transition-colors hover:border-[#E62058]"
          >
            Balances
          </button>
          {isConnected && (
            <button
              onClick={handleSwitchNetwork}
              className="rounded-full border border-theme bg-theme-muted px-4 py-2.5 text-sm font-medium text-theme transition-colors hover:border-[#E62058]"
            >
              Switch Chain
            </button>
          )}
          <button
            onClick={handleConnect}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
              isConnected
                ? "border border-theme bg-theme-muted text-secondary hover:bg-muted"
                : "gp-btn-primary text-white"
            }`}
          >
            {isConnected ? formatAddress(address) : "Connect Wallet"}
          </button>
        </div>
      </div>

      <BalanceModal isOpen={isBalancesOpen} onClose={() => setIsBalancesOpen(false)} />
    </div>
  );
};

export default Header;
