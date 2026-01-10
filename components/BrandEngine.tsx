import React, { useState, useEffect } from "react";
import {
  Palette, Plus, Settings, Eye, Download, Share2, Copy, Check, X,
  Trash2, Edit3, Save, ChevronRight, Droplet, Type, Layout, Image,
  Grid3X3, Sparkles, BookOpen, FileText, Layers, Star, Lock, Unlock
} from "lucide-react";
import { useCurrentUser } from "../hooks/useAppStore";

interface ColorSwatch {
  name: string;
  hex: string;
  usage: string;
}

interface FontConfig {
  name: string;
  family: string;
  weight: string;
  usage: string;
}

interface BrandKit {
  id: string;
  name: string;
  description: string;
  logo?: string;
  colors: ColorSwatch[];
  fonts: FontConfig[];
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

const DEFAULT_VIEWS_KIT: BrandKit = {
  id: "views-default",
  name: "VIEWS Brand Kit",
  description: "Official VIEWS creative studio brand guidelines",
  colors: [
    { name: "VIEWS Gold", hex: "#F5C242", usage: "Primary brand color, CTAs, highlights" },
    { name: "Gold Dark", hex: "#D4A520", usage: "Hover states, depth accents" },
    { name: "Gold Light", hex: "#FFD966", usage: "Subtle highlights, glows" },
    { name: "Background", hex: "#0A0A0A", usage: "Primary background" },
    { name: "Card", hex: "#141414", usage: "Card backgrounds, elevated surfaces" },
    { name: "Surface", hex: "#1A1A1A", usage: "Secondary backgrounds" },
    { name: "Text Primary", hex: "#FFFFFF", usage: "Headlines, primary text" },
    { name: "Text Secondary", hex: "#9CA3AF", usage: "Body text, descriptions" },
  ],
  fonts: [
    { name: "Oswald", family: "Oswald, sans-serif", weight: "600", usage: "Headlines, brand text" },
    { name: "Inter", family: "Inter, sans-serif", weight: "400", usage: "Body text, UI elements" },
    { name: "Roboto Mono", family: "Roboto Mono, monospace", weight: "400", usage: "Code, technical text" },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDefault: true
};

const BrandEngine: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"kits" | "colors" | "typography" | "guidelines">("kits");
  const [brandKits, setBrandKits] = useState<BrandKit[]>([DEFAULT_VIEWS_KIT]);
  const [selectedKit, setSelectedKit] = useState<BrandKit>(DEFAULT_VIEWS_KIT);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [newKitName, setNewKitName] = useState("");

  const user = useCurrentUser();

  useEffect(() => {
    // Load saved brand kits from localStorage
    const saved = localStorage.getItem("views_brand_kits");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBrandKits([DEFAULT_VIEWS_KIT, ...parsed.filter((k: BrandKit) => k.id !== "views-default")]);
      } catch (e) {
        console.error("Failed to load brand kits:", e);
      }
    }
  }, []);

  const saveBrandKits = (kits: BrandKit[]) => {
    const toSave = kits.filter(k => k.id !== "views-default");
    localStorage.setItem("views_brand_kits", JSON.stringify(toSave));
    setBrandKits(kits);
  };

  const copyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const createNewKit = () => {
    if (!newKitName.trim()) return;

    const newKit: BrandKit = {
      id: "kit_" + Date.now(),
      name: newKitName,
      description: "Custom brand kit",
      colors: [
        { name: "Primary", hex: "#F5C242", usage: "Main brand color" },
        { name: "Secondary", hex: "#1A1A1A", usage: "Supporting color" },
        { name: "Accent", hex: "#FFFFFF", usage: "Highlights" },
      ],
      fonts: [
        { name: "Headlines", family: "Inter, sans-serif", weight: "700", usage: "Headings" },
        { name: "Body", family: "Inter, sans-serif", weight: "400", usage: "Body text" },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false
    };

    saveBrandKits([...brandKits, newKit]);
    setSelectedKit(newKit);
    setShowCreateModal(false);
    setNewKitName("");
  };

  const updateColor = (index: number, field: keyof ColorSwatch, value: string) => {
    const updatedColors = [...selectedKit.colors];
    updatedColors[index] = { ...updatedColors[index], [field]: value };
    const updatedKit = { ...selectedKit, colors: updatedColors, updatedAt: new Date().toISOString() };
    setSelectedKit(updatedKit);
    saveBrandKits(brandKits.map(k => k.id === updatedKit.id ? updatedKit : k));
  };

  const addColor = () => {
    const updatedKit = {
      ...selectedKit,
      colors: [...selectedKit.colors, { name: "New Color", hex: "#888888", usage: "Define usage" }],
      updatedAt: new Date().toISOString()
    };
    setSelectedKit(updatedKit);
    saveBrandKits(brandKits.map(k => k.id === updatedKit.id ? updatedKit : k));
  };

  const removeColor = (index: number) => {
    const updatedColors = selectedKit.colors.filter((_, i) => i !== index);
    const updatedKit = { ...selectedKit, colors: updatedColors, updatedAt: new Date().toISOString() };
    setSelectedKit(updatedKit);
    saveBrandKits(brandKits.map(k => k.id === updatedKit.id ? updatedKit : k));
  };

  return (
    <div className="h-full flex flex-col bg-brand-dark">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/[0.06] bg-brand-dark/80 backdrop-blur-xl">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-views font-bold tracking-wide text-white">
                BRAND <span className="text-brand-gold">ENGINE</span>
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage your brand identity and design systems</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-gold text-black font-semibold text-sm rounded-xl hover:bg-brand-gold/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Brand Kit
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-6 bg-white/[0.03] rounded-xl p-1 w-fit">
            {[
              { id: "kits", label: "Brand Kits", icon: Layers },
              { id: "colors", label: "Colors", icon: Droplet },
              { id: "typography", label: "Typography", icon: Type },
              { id: "guidelines", label: "Guidelines", icon: BookOpen }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-brand-gold text-black"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "kits" && (
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {brandKits.map(kit => (
                <div
                  key={kit.id}
                  onClick={() => setSelectedKit(kit)}
                  className={`group bg-brand-card border rounded-2xl p-6 cursor-pointer transition-all hover:shadow-lg hover:shadow-brand-gold/5 ${
                    selectedKit.id === kit.id ? "border-brand-gold" : "border-white/[0.06] hover:border-brand-gold/30"
                  }`}
                >
                  {/* Color Preview */}
                  <div className="flex gap-1 mb-4">
                    {kit.colors.slice(0, 5).map((color, i) => (
                      <div
                        key={i}
                        className="flex-1 h-8 rounded-lg first:rounded-l-xl last:rounded-r-xl"
                        style={{ backgroundColor: color.hex }}
                      />
                    ))}
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        {kit.name}
                        {kit.isDefault && (
                          <span className="text-xs px-2 py-0.5 bg-brand-gold/20 text-brand-gold rounded-full">Default</span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{kit.description}</p>
                    </div>
                    {selectedKit.id === kit.id && (
                      <div className="w-6 h-6 rounded-full bg-brand-gold flex items-center justify-center">
                        <Check className="w-4 h-4 text-black" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                    <span>{kit.colors.length} colors</span>
                    <span>{kit.fonts.length} fonts</span>
                  </div>
                </div>
              ))}

              {/* Add New Kit Card */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-500 hover:border-brand-gold/30 hover:text-brand-gold transition-all min-h-[200px]"
              >
                <Plus className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Create New Kit</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === "colors" && (
          <div className="p-8">
            <div className="max-w-4xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedKit.name} - Colors</h2>
                  <p className="text-sm text-gray-500 mt-1">Click any color to copy its hex value</p>
                </div>
                {!selectedKit.isDefault && (
                  <button
                    onClick={addColor}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-brand-gold hover:bg-brand-gold/10 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Color
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {selectedKit.colors.map((color, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 bg-brand-card border border-white/[0.06] rounded-xl group"
                  >
                    <button
                      onClick={() => copyColor(color.hex)}
                      className="w-16 h-16 rounded-xl flex-shrink-0 relative group/swatch"
                      style={{ backgroundColor: color.hex }}
                    >
                      <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover/swatch:opacity-100 transition-opacity flex items-center justify-center">
                        {copiedColor === color.hex ? (
                          <Check className="w-5 h-5 text-white" />
                        ) : (
                          <Copy className="w-5 h-5 text-white" />
                        )}
                      </div>
                    </button>

                    <div className="flex-1 min-w-0">
                      {!selectedKit.isDefault ? (
                        <input
                          type="text"
                          value={color.name}
                          onChange={(e) => updateColor(index, "name", e.target.value)}
                          className="bg-transparent text-white font-medium text-sm focus:outline-none border-b border-transparent focus:border-brand-gold/50"
                        />
                      ) : (
                        <p className="text-white font-medium text-sm">{color.name}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{color.usage}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {!selectedKit.isDefault ? (
                        <input
                          type="color"
                          value={color.hex}
                          onChange={(e) => updateColor(index, "hex", e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer bg-transparent"
                        />
                      ) : null}
                      <code className="text-xs font-mono text-gray-400 bg-white/[0.03] px-2 py-1 rounded">
                        {color.hex}
                      </code>
                      {!selectedKit.isDefault && (
                        <button
                          onClick={() => removeColor(index)}
                          className="p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "typography" && (
          <div className="p-8">
            <div className="max-w-4xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedKit.name} - Typography</h2>
                  <p className="text-sm text-gray-500 mt-1">Font families and their usage guidelines</p>
                </div>
              </div>

              <div className="space-y-6">
                {selectedKit.fonts.map((font, index) => (
                  <div
                    key={index}
                    className="p-6 bg-brand-card border border-white/[0.06] rounded-xl"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{font.name}</h3>
                        <p className="text-sm text-gray-500">{font.usage}</p>
                      </div>
                      <code className="text-xs font-mono text-gray-400 bg-white/[0.03] px-3 py-1.5 rounded-lg">
                        {font.family}
                      </code>
                    </div>

                    <div className="space-y-3 mt-6">
                      <p className="text-4xl text-white" style={{ fontFamily: font.family, fontWeight: font.weight }}>
                        The quick brown fox
                      </p>
                      <p className="text-2xl text-white" style={{ fontFamily: font.family, fontWeight: font.weight }}>
                        jumps over the lazy dog
                      </p>
                      <p className="text-base text-gray-400" style={{ fontFamily: font.family }}>
                        ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "guidelines" && (
          <div className="p-8">
            <div className="max-w-4xl space-y-8">
              {/* Logo Usage */}
              <div className="bg-brand-card border border-white/[0.06] rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Image className="w-5 h-5 text-brand-gold" />
                  Logo Usage
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-brand-surface rounded-xl p-8 flex items-center justify-center">
                    <h2 className="text-4xl font-views font-bold tracking-wider">
                      <span className="text-brand-gold">VIEWS</span>
                    </h2>
                  </div>
                  <div className="bg-white rounded-xl p-8 flex items-center justify-center">
                    <h2 className="text-4xl font-views font-bold tracking-wider text-black">
                      VIEWS
                    </h2>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  <p>• Always maintain clear space around the logo equal to the height of the "V"</p>
                  <p>• Minimum size: 80px wide for digital, 1 inch for print</p>
                  <p>• Never stretch, rotate, or apply effects to the logo</p>
                </div>
              </div>

              {/* Color Guidelines */}
              <div className="bg-brand-card border border-white/[0.06] rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-brand-gold" />
                  Color Guidelines
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="h-24 rounded-xl bg-brand-gold mb-2" />
                    <p className="text-sm text-white font-medium">Primary Gold</p>
                    <p className="text-xs text-gray-500">Use for CTAs, highlights, and brand moments</p>
                  </div>
                  <div>
                    <div className="h-24 rounded-xl bg-[#0A0A0A] border border-white/10 mb-2" />
                    <p className="text-sm text-white font-medium">Background</p>
                    <p className="text-xs text-gray-500">Primary dark background for all screens</p>
                  </div>
                  <div>
                    <div className="h-24 rounded-xl bg-white mb-2" />
                    <p className="text-sm text-white font-medium">Text Primary</p>
                    <p className="text-xs text-gray-500">Headlines and important content</p>
                  </div>
                </div>
              </div>

              {/* Typography Guidelines */}
              <div className="bg-brand-card border border-white/[0.06] rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Type className="w-5 h-5 text-brand-gold" />
                  Typography Scale
                </h3>
                <div className="space-y-4">
                  <div className="flex items-baseline gap-4">
                    <span className="w-20 text-xs text-gray-500">H1</span>
                    <p className="text-4xl font-views font-bold text-white">Display Heading</p>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="w-20 text-xs text-gray-500">H2</span>
                    <p className="text-2xl font-views font-bold text-white">Section Heading</p>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="w-20 text-xs text-gray-500">H3</span>
                    <p className="text-xl font-semibold text-white">Card Heading</p>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="w-20 text-xs text-gray-500">Body</span>
                    <p className="text-base text-gray-400">Regular body text for descriptions and content.</p>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="w-20 text-xs text-gray-500">Caption</span>
                    <p className="text-sm text-gray-500">Small text for captions and metadata</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="bg-brand-card border border-white/[0.06] rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-white mb-4">Create Brand Kit</h3>
            <input
              type="text"
              placeholder="Brand kit name..."
              value={newKitName}
              onChange={(e) => setNewKitName(e.target.value)}
              className="w-full px-4 py-3 bg-brand-surface border border-white/[0.06] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50 mb-4"
              autoFocus
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createNewKit}
                disabled={!newKitName.trim()}
                className="flex-1 px-4 py-2.5 bg-brand-gold text-black font-semibold rounded-xl hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandEngine;
