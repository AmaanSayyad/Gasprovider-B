import React, { useEffect, useState } from "react";
import { GasFountainProvider, useGasFountain, ThemeProvider } from "./context";
import Layout from "./components/Layout";
import Header from "./components/Header";
import ProductHero from "./components/ProductHero";
import ProductStory from "./components/ProductStory";
import ActivityLog from "./components/ActivityLog";
import Step1Destinations from "./components/Step1Destinations";
import Step2Execution from "./components/Step2Execution";
import Step3Review from "./components/Step3Review";
import SchedulesList from "./components/SchedulesList";
import CalendarView from "./components/CalendarView";
import ReferralProgram from "./components/ReferralProgram";
import Gamification from "./components/Gamification";
import VoiceCommands from "./components/VoiceCommands";
import ReferralBanner from "./components/ReferralBanner";
import GasPools from "./components/GasPools";
import LiquidityProvider from "./components/LiquidityProvider";
import NexusProvider, { useNexus } from "./components/nexus/NexusProvider";
import { useAccount } from "wagmi";
import { EthereumProvider } from "@avail-project/nexus-core";
import { WalletProvider } from "./providers/WalletProvider";
import { WagmiProvider } from "wagmi";
import { appKitWagmiConfig } from "./config/wagmi";
const MainContent: React.FC = () => {
  const { handleInit, fetchUnifiedBalance } = useNexus();
  const { currentStep } = useGasFountain();
  const { connector, address } = useAccount();
  const [activeTab, setActiveTab] = useState<"activity" | "schedules" | "calendar" | "referrals" | "gamification" | "voice" | "pools" | "liquidity">("activity");

  useEffect(() => {
    const init = async () => {
      if (!connector || !address) return;
      try {
        const provider = (await connector.getProvider()) as EthereumProvider;
        if (provider) {
          await handleInit(provider);
          await fetchUnifiedBalance();
        }
      } catch (error) {
        console.error("Failed to initialize Nexus:", error);
      }
    };
    init();
  }, [connector, address]); // Only depend on connector and address, not the functions

  return (
    <div className="space-y-8 pb-16">
      {/* Referral Banner - Shows when user visits with ?ref=CODE */}
      <ReferralBanner />

      <div id="disperse" className="scroll-mt-28 min-h-[400px]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E62058]">
              Live app
            </p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-theme sm:text-3xl">
              Disperse gas
            </h2>
            <p className="mt-1 max-w-xl text-sm text-secondary">
              Pick destinations, pay FXRP or C2FLR on Coston2, and watch native gas land on each chain.
            </p>
          </div>
        </div>
        {currentStep === 1 && <Step1Destinations />}
        {currentStep === 2 && <Step3Review />}
        {currentStep === 3 && <Step2Execution />}
      </div>

      {/* Tabs for Activity, Schedules, and Calendar */}
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-theme overflow-x-auto">
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "activity"
                ? "text-primary border-primary"
                : "text-secondary border-transparent hover:text-theme"
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setActiveTab("schedules")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "schedules"
                ? "text-primary border-primary"
                : "text-secondary border-transparent hover:text-theme"
            }`}
          >
            Schedules
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "calendar"
                ? "text-primary border-primary"
                : "text-secondary border-transparent hover:text-theme"
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab("referrals")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "referrals"
                ? "text-primary border-primary"
                : "text-secondary border-transparent hover:text-theme"
            }`}
          >
            Referrals
          </button>
          <button
            onClick={() => setActiveTab("gamification")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "gamification"
                ? "text-primary border-primary"
                : "text-secondary border-transparent hover:text-theme"
            }`}
          >
            Achievements
          </button>
          <button
            onClick={() => setActiveTab("voice")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "voice"
                ? "text-primary border-primary"
                : "text-secondary border-transparent hover:text-theme"
            }`}
          >
            Voice
          </button>
          <button
            onClick={() => setActiveTab("pools")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "pools"
                ? "text-primary border-primary"
                : "text-secondary border-transparent hover:text-theme"
            }`}
          >
            Pools
          </button>
          <button
            onClick={() => setActiveTab("liquidity")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "liquidity"
                ? "text-primary border-primary"
                : "text-secondary border-transparent hover:text-theme"
            }`}
          >
            Earn
          </button>
        </div>

        {activeTab === "activity" && <ActivityLog />}
        {activeTab === "schedules" && <SchedulesList />}
        {activeTab === "calendar" && <CalendarView />}
        {activeTab === "referrals" && <ReferralProgram />}
        {activeTab === "gamification" && <Gamification />}
        {activeTab === "voice" && <VoiceCommands />}
        {activeTab === "pools" && <GasPools />}
        {activeTab === "liquidity" && <LiquidityProvider />}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <WalletProvider>
      <WagmiProvider config={appKitWagmiConfig}>
          <NexusProvider>
        <GasFountainProvider>
            <Layout>
              <Header />
              <ProductHero />
              <ProductStory />
              <MainContent />
            </Layout>
            </GasFountainProvider>
          </NexusProvider>
      </WagmiProvider>
      </WalletProvider>
    </ThemeProvider>
  );
};

export default App;
