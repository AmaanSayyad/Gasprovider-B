import React, { useState, useEffect } from "react";
import { Save, FolderOpen, Trash2, Star, Sparkles, Plus, X } from "lucide-react";
import { useGasFountain } from "../context/GasFountainContext";
import { ChainData } from "../types";
import { motion, AnimatePresence } from "framer-motion";

interface DispersalTemplate {
  id: string;
  name: string;
  description?: string;
  sourceChainId: string;
  sourceTokenSymbol: string;
  selectedChainIds: string[];
  transactionCounts: Record<string, number>;
  isFavorite: boolean;
  createdAt: number;
}

const DispersalTemplates: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    selectedChains,
    setSelectedChains,
    transactionCounts,
    setTransactionCounts,
    sourceChain,
    setSourceChain,
    sourceToken,
    setSourceToken,
    chains,
  } = useGasFountain();

  const [templates, setTemplates] = useState<DispersalTemplate[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<DispersalTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    const saved = localStorage.getItem("dispersalTemplates");
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to load templates:", error);
      }
    }
  };

  const saveTemplates = (newTemplates: DispersalTemplate[]) => {
    localStorage.setItem("dispersalTemplates", JSON.stringify(newTemplates));
    setTemplates(newTemplates);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !sourceChain || !sourceToken) return;

    const newTemplate: DispersalTemplate = {
      id: editingTemplate?.id || `template-${Date.now()}`,
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
      sourceChainId: sourceChain.id,
      sourceTokenSymbol: sourceToken.symbol,
      selectedChainIds: selectedChains.map((c) => c.id),
      transactionCounts: { ...transactionCounts },
      isFavorite: editingTemplate?.isFavorite || false,
      createdAt: editingTemplate?.createdAt || Date.now(),
    };

    const updated = editingTemplate
      ? templates.map((t) => (t.id === editingTemplate.id ? newTemplate : t))
      : [...templates, newTemplate];

    saveTemplates(updated);
    setShowSaveModal(false);
    setTemplateName("");
    setTemplateDescription("");
    setEditingTemplate(null);
  };

  const handleLoadTemplate = (template: DispersalTemplate) => {
    const chain = chains.find((c) => c.id === template.sourceChainId);
    if (chain) {
      setSourceChain(chain);
    }

    const token = sourceToken; // Keep current token or find matching one
    if (token) {
      setSourceToken(token);
    }

    const templateChains = chains.filter((c) => template.selectedChainIds.includes(c.id));
    setSelectedChains(templateChains);
    setTransactionCounts({ ...template.transactionCounts });
    onClose();
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      saveTemplates(templates.filter((t) => t.id !== id));
    }
  };

  const handleToggleFavorite = (id: string) => {
    saveTemplates(
      templates.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t))
    );
  };

  const sortedTemplates = [...templates].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="glass-card rounded-3xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/10"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-xl">
              <FolderOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Dispersal Templates</h2>
              <p className="text-white/60 text-sm">Save and reuse your common dispersal patterns</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingTemplate(null);
                setTemplateName("");
                setTemplateDescription("");
                setShowSaveModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-primary/90 hover:bg-primary text-white font-semibold flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Save Current
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {sortedTemplates.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-20 text-white/60" />
            <p className="text-white/60 text-lg mb-2">No templates yet</p>
            <p className="text-white/40 text-sm">Save your first template to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedTemplates.map((template) => {
              const chain = chains.find((c) => c.id === template.sourceChainId);
              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-primary/30 transition-all cursor-pointer group"
                  onClick={() => handleLoadTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {template.isFavorite && (
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        )}
                        <h3 className="font-bold text-white text-lg">{template.name}</h3>
                      </div>
                      {template.description && (
                        <p className="text-white/60 text-sm mb-2">{template.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span>{chain?.name || template.sourceChainId}</span>
                        <span>•</span>
                        <span>{template.sourceTokenSymbol}</span>
                        <span>•</span>
                        <span>{template.selectedChainIds.length} chains</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(template.id);
                        }}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-yellow-400 transition-colors"
                        title={template.isFavorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Star
                          className={`w-4 h-4 ${template.isFavorite ? "text-yellow-400 fill-yellow-400" : ""}`}
                        />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTemplate(template);
                          setTemplateName(template.name);
                          setTemplateDescription(template.description || "");
                          setShowSaveModal(true);
                        }}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        title="Edit template"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
                        title="Delete template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {template.selectedChainIds.slice(0, 3).map((chainId) => {
                      const c = chains.find((ch) => ch.id === chainId);
                      return c ? (
                        <span
                          key={chainId}
                          className="px-2 py-1 bg-white/5 rounded-lg text-xs text-white/70"
                        >
                          {c.name}
                        </span>
                      ) : null;
                    })}
                    {template.selectedChainIds.length > 3 && (
                      <span className="px-2 py-1 bg-white/5 rounded-lg text-xs text-white/70">
                        +{template.selectedChainIds.length - 3} more
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Save Modal */}
        <AnimatePresence>
          {showSaveModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={() => setShowSaveModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card rounded-2xl p-6 max-w-md w-full mx-4 border border-white/10"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-bold text-white">
                    {editingTemplate ? "Edit Template" : "Save Template"}
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Template Name</label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., All L2s, Ethereum Ecosystem"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Add a description..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowSaveModal(false);
                        setEditingTemplate(null);
                        setTemplateName("");
                        setTemplateDescription("");
                      }}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveTemplate}
                      disabled={!templateName.trim()}
                      className="flex-1 px-4 py-3 rounded-xl bg-primary hover:bg-blue-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editingTemplate ? "Update" : "Save"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default DispersalTemplates;

