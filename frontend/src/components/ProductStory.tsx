import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Coins, Radio, Waves } from "lucide-react";

const steps = [
  {
    icon: Coins,
    title: "Deposit on BOT Chain",
    body: "Fund with USDT on BOT Chain. One payment covers gas across the destinations you pick.",
  },
  {
    icon: Radio,
    title: "Split by budget",
    body: "Your deposit is divided into a USD gas budget per destination, exactly as you allocate it.",
  },
  {
    icon: Waves,
    title: "Gas drips out",
    body: "Treasury sends native gas to Base, Optimism, World, and more — ready to spend.",
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
          className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0C9C78]"
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
          New wallets burn time hunting faucet gas on every testnet. Gas Provider turns a single
          BOT Chain deposit into usable native gas on the networks your demo already needs.
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
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(12,156,120,0.1)] text-[#0C9C78]">
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <p className="mb-1 font-display text-xs font-semibold uppercase tracking-[0.2em] text-[#12B88D]">
                Step {i + 1}
              </p>
              <h3 className="font-display text-xl font-bold text-theme">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-secondary">{step.body}</p>
            </motion.div>
          );
        })}
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
            <p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-[#0C9C78]">
              How it works
            </p>
            <h3 className="font-display text-2xl font-bold tracking-tight text-theme sm:text-3xl">
              Purpose-built gas provisioning — not a generic multi-send.
            </h3>
            <ul className="space-y-4 text-sm leading-relaxed text-secondary">
              <li className="border-t border-theme pt-4 first:border-0 first:pt-0">
                <span className="font-semibold text-theme">One deposit · </span>
                Pay USDT once on BOT Chain; the escrow records your per-chain split on-chain.
              </li>
              <li className="border-t border-theme pt-4">
                <span className="font-semibold text-theme">Native gas out · </span>
                A treasury on each destination sends real native gas to your address.
              </li>
              <li className="border-t border-theme pt-4">
                <span className="font-semibold text-theme">Try it · </span>
                Connect MetaMask → BOT Chain → Review → Disperse. See confirmed drips in Activity.
              </li>
            </ul>
          </div>
          <div className="relative min-h-[240px] overflow-hidden bg-[#0C9C78] lg:min-h-full">
            <img
              src="/particle-field.svg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-screen"
              aria-hidden
            />
            <div className="relative z-10 flex h-full flex-col justify-end p-8">
              <img src="/botchain.png" alt="BOT Chain" className="mb-4 h-14 w-14 rounded-full object-cover shadow-lg" />
              <p className="font-display text-2xl font-bold text-white">Settled on BOT Chain</p>
              <p className="mt-1 text-sm text-white/85">
                USDT in · native gas out
              </p>
              <a
                href="https://scan.botchain.ai/"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-fit items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0C9C78]"
              >
                scan.botchain.ai
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
