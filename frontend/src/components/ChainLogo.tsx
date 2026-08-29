import React, { useEffect, useMemo, useState } from "react";
import {
  chainLogoCandidates,
  FALLBACK_CHAIN_LOGO,
} from "../data/chainLogos";

type Props = {
  chainId: number;
  name?: string;
  src?: string;
  icon?: string;
  slug?: string;
  size?: number;
  className?: string;
};

/**
 * Official chain mark from bundled Web3 Icons, then Chainlist IPFS, then Llama.
 * Cycles candidates on error so a broken CDN never sticks on the wrong image.
 */
const ChainLogo: React.FC<Props> = ({
  chainId,
  name = "",
  src,
  icon,
  slug,
  size = 32,
  className = "",
}) => {
  const candidates = useMemo(() => {
    const list = chainLogoCandidates(chainId, name, icon, slug);
    const preferLocal =
      src &&
      (src.startsWith("/") ||
        src.includes("web3icons") ||
        src.includes("jsdelivr"));
    if (preferLocal && src && !list.includes(src)) return [src, ...list];
    return list.length ? list : [FALLBACK_CHAIN_LOGO];
  }, [chainId, name, src, icon, slug]);

  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [candidates]);

  const exhausted = idx >= candidates.length;
  const url = candidates[Math.min(idx, candidates.length - 1)];
  const letter = (name || "?").replace(/^[^a-zA-Z]+/, "").charAt(0).toUpperCase() || "?";

  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-full shrink-0 bg-white/10 ${className}`}
      style={{ width: size, height: size }}
    >
      {exhausted ? (
        <span
          className="flex h-full w-full items-center justify-center font-bold text-white/80"
          style={{ fontSize: Math.max(10, size * 0.42) }}
        >
          {letter}
        </span>
      ) : (
        <img
          src={url}
          alt={name || `chain ${chainId}`}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setIdx((i) => i + 1)}
        />
      )}
    </span>
  );
};

export default ChainLogo;
