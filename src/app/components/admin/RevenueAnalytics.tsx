import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { DollarSign, TrendingUp } from "lucide-react";

export function RevenueAnalytics() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRevenue() {
      const { data: subs, error } = await supabase
        .from('subscriptions')
        .select('created_at, amount')
        .eq('status', 'active');
        
      if (!error && subs) {
        // Group by month
        const grouped: Record<string, number> = {};
        let totalRev = 0;
        
        subs.forEach(s => {
          if (s.amount) {
            const date = new Date(s.created_at);
            const month = date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear();
            grouped[month] = (grouped[month] || 0) + s.amount;
            totalRev += s.amount;
          }
        });
        
        const chartData = Object.keys(grouped).map(key => ({
          name: key,
          revenue: grouped[key]
        }));
        
        setData(chartData);
        setTotal(totalRev);
      }
      setLoading(false);
    }
    fetchRevenue();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-[#2563EB] to-[#0B3D91] rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2 rounded-xl">
              <DollarSign size={24} />
            </div>
            <h3 className="font-semibold text-white/80">Total Revenue</h3>
          </div>
          <p className="text-4xl font-bold font-['Manrope']">₦{total.toLocaleString()}</p>
        </div>
        <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6">
           <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#22C55E]/10 p-2 rounded-xl text-[#22C55E]">
              <TrendingUp size={24} />
            </div>
            <h3 className="font-semibold text-[#94A3B8]">Growth Rate</h3>
          </div>
          <p className="text-3xl font-bold text-white">+14.5%</p>
          <p className="text-xs text-[#64748B] mt-1">vs last month (mocked)</p>
        </div>
      </div>

      <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6 h-[400px]">
        <h3 className="text-white font-bold mb-6">Revenue Over Time</h3>
        {loading ? (
          <div className="h-full flex items-center justify-center text-[#64748B]">Loading chart data...</div>
        ) : data.length === 0 ? (
           <div className="h-full flex items-center justify-center text-[#64748B]">No revenue data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₦${val}`} />
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#2563EB" fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
