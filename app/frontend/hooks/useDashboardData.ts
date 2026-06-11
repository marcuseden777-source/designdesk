import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import type { Designer } from "@/types";

export function useDashboardData() {
  const [designer, setDesigner] = useState<Designer | null>(null);
  const [quoteCount, setQuoteCount] = useState(0);
  const [recentQuotes, setRecentQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      let designerData = null;
      if (user) {
        const { data: profile } = await supabase
          .from("designers")
          .select("subscription_tier")
          .eq("id", user.id)
          .single();
        
        designerData = {
          id: user.id,
          email: user.email ?? "",
          full_name: user.user_metadata?.full_name ?? "Designer",
          subscription_tier: profile?.subscription_tier ?? "free",
          created_at: user.created_at,
        };
      }
      setDesigner(designerData);

      const quotes = await api.listQuotations() as any[];
      setQuoteCount(quotes.length);
      setRecentQuotes(quotes.slice(0, 4));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { designer, quoteCount, recentQuotes, loading, refresh: loadData };
}
