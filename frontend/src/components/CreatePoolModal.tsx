import React, { useState } from "react";
import { X, Users, DollarSign, Lock, Unlock, Zap, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CreatePoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => void;
}

const CreatePoolModal: React.FC<CreatePoolModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [minContribution, setMinContribution] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [autoDistribute, setAutoDistribute] = useState(true);

  const handleSubmit = () => {
    if (!name.trim() || !minContribution) {
      alert("Please fill in all required fields");
      return;
    }

    onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      minContribution,
      maxMembers: maxMembers ? parseInt(maxMembers) : undefined,
      isPublic,
      autoDistribute,
    });

    // Reset form
    setName("");
    setDescription("");
    setMinContribution("");
    setMaxMembers("");
    setIsPublic(true);
    setAutoDistribute(true);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl glass-card border border-theme rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-theme flex items-center justify-between sticky top-0 bg-theme-muted z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 rounded-2xl">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-theme">Create Gas Pool</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
            <div>
              <label className="block text-sm font-semibold text-theme mb-2">
                Pool Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Team Gas Pool"
                className="w-full px-4 py-3 rounded-xl bg-theme-muted border border-theme text-theme placeholder:text-secondary focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-theme mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your pool..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-theme-muted border border-theme text-theme placeholder:text-secondary focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-theme mb-2">
                  Min Contribution (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={minContribution}
                  onChange={(e) => setMinContribution(e.target.value)}
                  placeholder="10.00"
                  className="w-full px-4 py-3 rounded-xl bg-theme-muted border border-theme text-theme placeholder:text-secondary focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-theme mb-2">
                  Max Members (Optional)
                </label>
                <input
                  type="number"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value)}
                  placeholder="Unlimited"
                  className="w-full px-4 py-3 rounded-xl bg-theme-muted border border-theme text-theme placeholder:text-secondary focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-theme-muted rounded-xl border border-theme">
                <div className="flex items-center gap-3">
                  {isPublic ? (
                    <Unlock className="w-5 h-5 text-primary" />
                  ) : (
                    <Lock className="w-5 h-5 text-secondary" />
                  )}
                  <div>
                    <div className="font-semibold text-theme">Public Pool</div>
                    <div className="text-xs text-secondary">Others can discover and join</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isPublic
                      ? "bg-primary text-white"
                      : "bg-theme-muted border border-theme text-theme"
                  }`}
                >
                  {isPublic ? "Public" : "Private"}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-theme-muted rounded-xl border border-theme">
                <div className="flex items-center gap-3">
                  <Zap className={`w-5 h-5 ${autoDistribute ? "text-primary" : "text-secondary"}`} />
                  <div>
                    <div className="font-semibold text-theme">Auto-Distribute</div>
                    <div className="text-xs text-secondary">Automatically distribute when member needs gas</div>
                  </div>
                </div>
                <button
                  onClick={() => setAutoDistribute(!autoDistribute)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    autoDistribute
                      ? "bg-primary text-white"
                      : "bg-theme-muted border border-theme text-theme"
                  }`}
                >
                  {autoDistribute ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-theme flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl bg-theme-muted border border-theme text-theme hover:bg-muted transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 rounded-xl bg-primary text-white hover:bg-blue-600 transition-colors font-semibold shadow-lg shadow-primary/20"
            >
              Create Pool
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreatePoolModal;

