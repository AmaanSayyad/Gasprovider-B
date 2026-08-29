import React from "react";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";
import { PITCH_DECK_URL, DEMO_VIDEO_URL } from "../data/links";

const ProductHero: React.FC = () => {
  const { open } = useAppKit();
  const { isConnected } = useAccount();

  const scrollToApp = () => {
    document.getElementById("disperse")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="gp-hero relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="/flare/particle-field.svg"
          alt=""
          className="h-full w-full object-cover gp-hero-kenburns opacity-90"
          aria-hidden
        />
        <div className="absolute inset-0 gp-hero-veil" />
        <span className="gp-orb hidden sm:block" style={{ width: 42, height: 42, top: "18%", right: "14%", animationDelay: "0s" }} />
        <span className="gp-orb hidden sm:block" style={{ width: 22, height: 22, top: "32%", right: "24%", animationDelay: "1.2s", opacity: 0.7 }} />
        <span className="gp-orb hidden md:block" style={{ width: 64, height: 64, bottom: "22%", right: "8%", animationDelay: "0.6s", opacity: 0.85 }} />
        <span className="gp-orb hidden md:block" style={{ width: 16, height: 16, top: "48%", right: "36%", animationDelay: "2s", opacity: 0.55 }} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[min(88vh,820px)] w-full max-w-6xl flex-col justify-end px-5 pb-14 pt-24 sm:px-8 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-6 flex flex-wrap items-center gap-3"
        >
          <a
            href="https://flare.network/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(36,41,46,0.12)] bg-white/80 px-3 py-1.5 backdrop-blur"
          >
            <img src="/flarelogo.png" alt="Flare" className="h-6 w-6 rounded-full object-cover" />
            <span className="font-display text-sm font-semibold tracking-tight text-[#24292E]">
              flare
            </span>
          </a>
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E62058]">
            Summer Signal · Track 1
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="font-display max-w-4xl text-[clamp(2.8rem,8vw,5.6rem)] font-extrabold leading-[0.95] tracking-tight text-[#24292E] dark:text-white"
        >
          Gas Provider
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="mt-5 max-w-xl text-lg leading-relaxed text-[#5c656d] dark:text-white/80 sm:text-xl"
        >
          Pay once in FXRP or C2FLR on Coston2 — get native gas on the chains you use.
          Priced by FTSO. Verified with FDC. Built on Flare, the blockchain for data.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <button type="button" onClick={scrollToApp} className="gp-btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold">
            Start dispersing
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => (isConnected ? scrollToApp() : open())}
            className="gp-btn-ghost inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold"
          >
            {isConnected ? "Open app" : "Connect wallet"}
          </button>
          <a
            href="https://faucet.flare.network/coston2"
            target="_blank"
            rel="noreferrer"
            className="gp-btn-ghost inline-flex items-center gap-2 px-5 py-3 text-sm font-medium"
          >
            Coston2 faucet
          </a>
          <a
            href={DEMO_VIDEO_URL}
            target="_blank"
            rel="noreferrer"
            className="gp-btn-ghost inline-flex items-center gap-2 px-5 py-3 text-sm font-medium"
          >
            Demo video
          </a>
          <a
            href={PITCH_DECK_URL}
            target="_blank"
            rel="noreferrer"
            className="gp-btn-ghost inline-flex items-center gap-2 px-5 py-3 text-sm font-medium"
          >
            Pitch deck
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default ProductHero;
