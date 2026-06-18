import { useState, useEffect } from "react";
import { Save, Plus, Trash2, Shield, Settings, Globe, CreditCard } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { Skeleton } from "../../components/ui/skeleton";

export function SiteSettingsView() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("pricing");

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("site_settings").select("*");
    if (!error && data) {
      const parsed: any = {};
      data.forEach(item => { parsed[item.key] = item.value; });
      setSettings(parsed);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async (key: string, value: any) => {
    setSaving(true);
    const { error } = await supabase.rpc("upsert_site_setting", { p_key: key, p_value: value });
    if (error) toast.error(`Failed to save ${key}`);
    else toast.success(`${key} saved successfully`);
    setSaving(false);
  };

  if (loading) return <Skeleton className="h-96 w-full bg-[#0F1F35] rounded-xl" />;

  return (
    <div className="bg-[#0F1F35] border border-white/5 rounded-2xl p-6">
      <h2 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
        <Globe className="text-[#60A5FA]" size={20} /> Content Management
      </h2>

      <div className="flex gap-2 mb-6 border-b border-white/5 pb-4">
        {["pricing", "hero", "contact", "faq"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
              activeTab === tab ? "bg-[#2563EB] text-white" : "bg-[#1E293B] text-[#94A3B8] hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "pricing" && (
        <div className="space-y-6">
          <p className="text-[#94A3B8] text-sm">Edit the pricing plans shown on the premium page. JSON format required for now.</p>
          <textarea
            className="w-full h-96 bg-[#1E293B] border border-white/10 rounded-xl p-4 text-[#CBD5E1] font-mono text-xs focus:outline-none focus:border-[#2563EB]/50"
            title="Pricing Plans JSON"
            placeholder="Pricing Plans JSON"
            value={JSON.stringify(settings.pricing_plans, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setSettings({ ...settings, pricing_plans: parsed });
              } catch (e) { /* ignore parse errors while typing */ }
            }}
          />
          <button
            onClick={() => handleSave("pricing_plans", settings.pricing_plans)}
            disabled={saving}
            className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16A34A] text-white px-5 py-2.5 rounded-xl font-bold transition-all"
          >
            <Save size={16} /> Save Pricing Plans
          </button>
        </div>
      )}

      {activeTab === "hero" && (
        <div className="space-y-6">
          <p className="text-[#94A3B8] text-sm">Edit the landing page hero section text.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-[#94A3B8] text-xs font-semibold mb-2">Headline</label>
              <input
                type="text"
                title="Headline"
                placeholder="Headline"
                value={settings.hero_text?.headline || ""}
                onChange={(e) => setSettings({ ...settings, hero_text: { ...settings.hero_text, headline: e.target.value }})}
                className="w-full bg-[#1E293B] border border-white/6 rounded-xl px-4 py-3 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-[#94A3B8] text-xs font-semibold mb-2">Subheadline</label>
              <textarea
                title="Subheadline"
                placeholder="Subheadline"
                value={settings.hero_text?.subheadline || ""}
                onChange={(e) => setSettings({ ...settings, hero_text: { ...settings.hero_text, subheadline: e.target.value }})}
                className="w-full h-24 bg-[#1E293B] border border-white/6 rounded-xl px-4 py-3 text-white text-sm"
              />
            </div>
          </div>
          <button
            onClick={() => handleSave("hero_text", settings.hero_text)}
            disabled={saving}
            className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16A34A] text-white px-5 py-2.5 rounded-xl font-bold transition-all"
          >
            <Save size={16} /> Save Hero Section
          </button>
        </div>
      )}

      {/* Other tabs omitted for brevity but they follow the same pattern */}
      {(activeTab === "contact" || activeTab === "faq") && (
        <div className="space-y-6">
          <p className="text-[#94A3B8] text-sm">Edit {activeTab} data (JSON format).</p>
          <textarea
            className="w-full h-64 bg-[#1E293B] border border-white/10 rounded-xl p-4 text-[#CBD5E1] font-mono text-xs focus:outline-none focus:border-[#2563EB]/50"
            title={`${activeTab} JSON`}
            placeholder={`${activeTab} JSON`}
            value={JSON.stringify(settings[activeTab === 'contact' ? 'contact_info' : 'faq'], null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setSettings({ ...settings, [activeTab === 'contact' ? 'contact_info' : 'faq']: parsed });
              } catch (e) {}
            }}
          />
          <button
            onClick={() => handleSave(activeTab === 'contact' ? 'contact_info' : 'faq', settings[activeTab === 'contact' ? 'contact_info' : 'faq'])}
            disabled={saving}
            className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16A34A] text-white px-5 py-2.5 rounded-xl font-bold transition-all"
          >
            <Save size={16} /> Save {activeTab}
          </button>
        </div>
      )}
    </div>
  );
}
