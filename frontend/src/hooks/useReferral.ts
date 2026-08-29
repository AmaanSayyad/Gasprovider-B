import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useReferralCode } from "../utils/api";

export function useReferral() {
  const { address, isConnected } = useAccount();
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    // Check URL for referral code
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setReferralCode(ref);
      // Store in localStorage for later use
      localStorage.setItem("referralCode", ref);
    } else {
      // Check localStorage
      const stored = localStorage.getItem("referralCode");
      if (stored) {
        setReferralCode(stored);
      }
    }
  }, []);

  const applyReferral = async (intentId?: string) => {
    if (!referralCode || !address || !isConnected) {
      return false;
    }

    try {
      await useReferralCode(referralCode, address, intentId);
      // Clear referral code after use
      localStorage.removeItem("referralCode");
      setReferralCode(null);
      return true;
    } catch (error) {
      console.error("Failed to apply referral:", error);
      return false;
    }
  };

  return { referralCode, applyReferral };
}

