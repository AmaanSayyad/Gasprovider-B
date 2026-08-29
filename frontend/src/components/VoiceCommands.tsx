import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, Languages, CheckCircle, XCircle, Radio, Sparkles } from "lucide-react";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { getApiBaseUrl } from "../utils/api";

interface VoiceCommand {
  command: string;
  language: string;
  status: "processing" | "success" | "error";
  timestamp: Date;
}

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
];

const COMMAND_PATTERNS = {
  en: {
    disperse: /disperse|send|distribute/i,
    amount: /(\d+(?:\.\d+)?)\s*(?:usd|dollars?)/i,
    chains: /to\s+(.+?)(?:\s+and\s+)?/i,
  },
  es: {
    disperse: /dispersar|enviar|distribuir/i,
    amount: /(\d+(?:\.\d+)?)\s*(?:usd|dólares?)/i,
    chains: /a\s+(.+?)(?:\s+y\s+)?/i,
  },
  fr: {
    disperse: /disperser|envoyer|distribuer/i,
    amount: /(\d+(?:\.\d+)?)\s*(?:usd|dollars?)/i,
    chains: /à\s+(.+?)(?:\s+et\s+)?/i,
  },
};

const VoiceCommands: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState("en");
  const [transcript, setTranscript] = useState("");
  const [commands, setCommands] = useState<VoiceCommand[]>([]);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = language;

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setTranscript(transcript);
          processCommand(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          setError(`Speech recognition error: ${event.error}`);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language]);

  const startListening = () => {
    if (!recognitionRef.current) {
      setError("Speech recognition not supported in this browser");
      return;
    }

    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    setError(null);
    setTranscript("");
    setIsListening(true);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const processCommand = async (text: string) => {
    const command: VoiceCommand = {
      command: text,
      language,
      status: "processing",
      timestamp: new Date(),
    };

    setCommands((prev) => [command, ...prev.slice(0, 9)]);

    try {
      // Parse command based on language
      const patterns = COMMAND_PATTERNS[language as keyof typeof COMMAND_PATTERNS] || COMMAND_PATTERNS.en;
      
      const isDisperseCommand = patterns.disperse.test(text);
      
      if (isDisperseCommand) {
        // Extract amount
        const amountMatch = text.match(patterns.amount);
        const amount = amountMatch ? amountMatch[1] : null;

        // Send to backend
        const response = await fetch(`${getApiBaseUrl()}/voice/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userAddress: address,
            command: text,
            language,
          }),
        });

        if (response.ok) {
          command.status = "success";
          setCommands((prev) =>
            prev.map((c, i) => (i === 0 ? command : c))
          );
        } else {
          throw new Error("Failed to process command");
        }
      } else {
        command.status = "error";
        setCommands((prev) =>
          prev.map((c, i) => (i === 0 ? command : c))
        );
        setError("Command not recognized. Try: 'Disperse 100 USD to Base and Optimism'");
      }
    } catch (err: any) {
      command.status = "error";
      setCommands((prev) => prev.map((c, i) => (i === 0 ? command : c)));
      setError(err.message || "Failed to process voice command");
    }
  };

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-12 text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Mic className="w-10 h-10 text-primary" />
        </div>
        <p className="text-white/60 text-lg">Connect your wallet to use voice commands</p>
      </motion.div>
    );
  }

  const isSupported = typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const selectedLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === language);

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-8 relative overflow-hidden"
      >
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-purple-600/10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="p-4 bg-gradient-to-br from-primary/30 to-purple-600/30 rounded-2xl backdrop-blur-sm border border-primary/20 shadow-lg shadow-primary/20"
              >
                <Mic className="w-6 h-6 text-primary" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Voice Commands</h2>
                <p className="text-white/60">Control dispersals with your voice</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Languages className="w-5 h-5 text-white/60" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition-colors cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isSupported ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <MicOff className="w-10 h-10 text-red-400" />
              </div>
              <p className="text-white/60 text-lg mb-2">Voice recognition not supported</p>
              <p className="text-white/40 text-sm">
                Please use Chrome, Edge, or Safari for voice commands
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Voice Control */}
              <div className="flex flex-col items-center gap-6">
                <motion.div
                  className="relative"
                  animate={isListening ? {
                    scale: [1, 1.1, 1],
                  } : {}}
                  transition={{
                    duration: 2,
                    repeat: isListening ? Infinity : 0,
                  }}
                >
                  {/* Pulsing rings when listening */}
                  {isListening && (
                    <>
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-primary/30"
                        animate={{
                          scale: [1, 1.5, 1.5],
                          opacity: [0.5, 0, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                        }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-primary/20"
                        animate={{
                          scale: [1, 1.3, 1.3],
                          opacity: [0.5, 0, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: 0.5,
                        }}
                      />
                    </>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={isListening ? stopListening : startListening}
                    className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-2xl ${
                      isListening
                        ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                        : "bg-gradient-to-br from-primary to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    } text-white`}
                  >
                    {isListening ? (
                      <MicOff className="w-12 h-12" />
                    ) : (
                      <Mic className="w-12 h-12" />
                    )}
                  </motion.button>
                </motion.div>

                <div className="text-center">
                  <motion.p
                    animate={isListening ? { opacity: [1, 0.5, 1] } : {}}
                    transition={{ duration: 1.5, repeat: isListening ? Infinity : 0 }}
                    className="text-white font-bold text-xl mb-2"
                  >
                    {isListening ? (
                      <span className="flex items-center justify-center gap-2">
                        <Radio className="w-5 h-5 text-red-400 animate-pulse" />
                        Listening...
                      </span>
                    ) : (
                      "Click to start"
                    )}
                  </motion.p>
                  <p className="text-sm text-white/60">
                    Say: "Disperse 100 USD to Base and Optimism"
                  </p>
                  {selectedLanguage && (
                    <p className="text-xs text-white/40 mt-1">
                      Language: {selectedLanguage.flag} {selectedLanguage.name}
                    </p>
                  )}
                </div>

                <AnimatePresence>
                  {transcript && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="w-full p-5 bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-2xl border border-primary/30 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Volume2 className="w-4 h-4 text-primary" />
                        <span className="text-xs text-white/60 font-semibold uppercase tracking-wider">Heard:</span>
                      </div>
                      <p className="text-white text-base font-medium">{transcript}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="w-full p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5" />
                        <span>{error}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Example Commands */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <div className="text-sm font-bold text-white uppercase tracking-wider">Example Commands</div>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    "Disperse 100 USD to Base and Optimism",
                    "Send 50 dollars to Optimism",
                    "Distribute 200 USD across 5 chains",
                  ].map((cmd, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.02, x: 4 }}
                      className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-white/70 hover:bg-white/10 transition-colors"
                    >
                      "{cmd}"
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Command History */}
      {commands.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-3xl p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-primary/20 rounded-2xl">
              <Radio className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white">Recent Commands</h3>
          </div>
          <div className="space-y-3">
            {commands.map((cmd, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, x: 4 }}
                className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between backdrop-blur-sm hover:bg-white/10 transition-all"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-white mb-1">{cmd.command}</p>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <span>{cmd.timestamp.toLocaleTimeString()}</span>
                    <span>•</span>
                    <span className="uppercase">{cmd.language}</span>
                  </div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  className="ml-4"
                >
                  {cmd.status === "success" ? (
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    </div>
                  ) : cmd.status === "error" ? (
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <XCircle className="w-6 h-6 text-red-400" />
                    </div>
                  ) : (
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default VoiceCommands;
