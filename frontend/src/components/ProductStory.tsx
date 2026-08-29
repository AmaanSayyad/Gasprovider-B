import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Coins, Radio, Waves } from "lucide-react";
import { PITCH_DECK_URL, DEMO_VIDEO_URL } from "../data/links";

const steps = [
  {
    icon: Coins,
    title: "Deposit on Flare",
    body: "Fund with FXRP or C2FLR on Coston2. One payment covers gas across the destinations you pick.",
  },
  {
    icon: Radio,
    title: "Priced by FTSO",
    body: "Flare Time Series Oracle converts your deposit into fair USD gas budgets per chain — block-latency feeds.",
  },
  {
    icon: Waves,
    title: "Gas drips out",
    body: "Treasury sends native gas to Base, Optimism, World, and more — ready to spend.",
  },
];

const protocols = [
  {
    name: "FAssets",
    blurb: "Bring XRP into programmable finance as FXRP — the payment rail for this demo.",
    href: "https://flare.network/products/fassets",
    docs: "https://dev.flare.network/fassets/overview/",
  },
  {
    name: "FTSO",
    blurb: "High-integrity, block-latency price feeds that price every gas quote in this app.",
    href: "https://flare.network/products/flare-time-series-oracle",
    docs: "https://dev.flare.network/",
  },
  {
    name: "FDC",
    blurb: "Flare Data Connector attests deposit transactions so dispersal can be verified.",
    href: "https://flare.network/products/flare-data-connector",
    docs: "https://dev.flare.network/",
  },
  {
    name: "Smart Accounts",
    blurb: "Control assets from XRPL, execute on Flare — the long-term UX path for FXRP users.",
    href: "https://flare.network/products/flare-smart-accounts",
    docs: "https://dev.flare.network/",
  },
];

const ProductStory: React.FC = () => {
  return (
    <section className="gp-story relative space-y-16 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-[#E62058]"
        >
          The blockchain for data
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mt-3 font-display text-3xl font-bold tracking-tight text-theme sm:text-4xl"
        >
          What Gas Provider does
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="mt-4 text-base leading-relaxed text-secondary sm:text-lg"
        >
          New wallets burn time hunting faucet gas on every testnet. Gas Provider turns a single Flare deposit
          into usable native gas on the networks your demo already needs — powered by enshrined data protocols.
        </motion.p>
      </div>

      <div className="grid gap-10 md:grid-cols-3 md:gap-8">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className="gp-step relative"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(230,32,88,0.1)] text-[#E62058]">
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <p className="mb-1 font-display text-xs font-semibold uppercase tracking-[0.2em] text-[#E46389]">
                Step {i + 1}
              </p>
              <h3 className="font-display text-xl font-bold text-theme">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-secondary">{step.body}</p>
            </motion.div>
          );
        })}
      </div>

      <div>
        <div className="mb-6">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E62058]">
            Built with Flare
          </p>
          <h3 className="font-display text-2xl font-bold tracking-tight text-theme">
            Enshrined protocols in this product
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {protocols.map((p, i) => (
            <motion.a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="gp-product-tile group block p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold text-theme group-hover:text-[#E62058]">
                    {p.name}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-secondary">{p.blurb}</p>
                </div>
                <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[#E46389] opacity-70 transition group-hover:opacity-100" />
              </div>
              <p className="mt-4 text-xs font-medium text-[#E62058]">
                {p.docs.replace("https://", "")}
              </p>
            </motion.a>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="gp-judge-panel overflow-hidden rounded-[1.75rem] border"
      >
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5 p-7 sm:p-9">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-[#E62058]">
              For hackathon judges
            </p>
            <h3 className="font-display text-2xl font-bold tracking-tight text-theme sm:text-3xl">
              Flare-native gas provisioning — not a generic multi-send.
            </h3>
            <ul className="space-y-4 text-sm leading-relaxed text-secondary">
              <li className="border-t border-theme pt-4 first:border-0 first:pt-0">
                <span className="font-semibold text-theme">Interoperable assets · </span>
                FXRP + C2FLR payment rail aligned with{" "}
                <a className="text-[#E62058] hover:underline" href="https://flare.network/products/fassets" target="_blank" rel="noreferrer">
                  FAssets
                </a>
                .
              </li>
              <li className="border-t border-theme pt-4">
                <span className="font-semibold text-theme">FTSO pricing · </span>
                Live feeds from{" "}
                <a className="text-[#E62058] hover:underline" href="https://flare.network/products/flare-time-series-oracle" target="_blank" rel="noreferrer">
                  Flare Time Series Oracle
                </a>
                .
              </li>
              <li className="border-t border-theme pt-4">
                <span className="font-semibold text-theme">FDC attestation · </span>
                Best-effort deposit proofs via{" "}
                <a className="text-[#E62058] hover:underline" href="https://flare.network/products/flare-data-connector" target="_blank" rel="noreferrer">
                  Flare Data Connector
                </a>
                .
              </li>
              <li className="border-t border-theme pt-4">
                <span className="font-semibold text-theme">Try it · </span>
                Connect MetaMask → Coston2 → Review → Disperse. See confirmed drips in Activity.
              </li>
              <li className="border-t border-theme pt-4">
                <span className="font-semibold text-theme">Demo video · </span>
                <a
                  className="text-[#E62058] hover:underline"
                  href={DEMO_VIDEO_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Watch the walkthrough
                </a>
                .
              </li>
              <li className="border-t border-theme pt-4">
                <span className="font-semibold text-theme">Pitch deck · </span>
                <a
                  className="text-[#E62058] hover:underline"
                  href={PITCH_DECK_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  View the submission slides
                </a>
                .
              </li>
            </ul>
          </div>
          <div className="relative min-h-[240px] overflow-hidden bg-[#E62058] lg:min-h-full">
            <img
              src="/flare/particle-field.svg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-screen"
              aria-hidden
            />
            <div className="relative z-10 flex h-full flex-col justify-end p-8">
              <img src="/flarelogo.png" alt="Flare" className="mb-4 h-14 w-14 rounded-full object-cover shadow-lg" />
              <p className="font-display text-2xl font-bold text-white">Powered by Flare</p>
              <p className="mt-1 text-sm text-white/85">
                FTSO · FDC · FAssets · Smart Accounts
              </p>
              <a
                href="https://flare.network/"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-fit items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#E62058]"
              >
                flare.network
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default ProductStory;
