import { supabase } from "./supabase";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Quotation
  getCatalog: () => request<CatalogCategory[]>("/api/quotation/catalog"),
  createQuotation: (payload: CreateQuotationPayload) =>
    request<{ id: string }>("/api/quotation", { method: "POST", body: JSON.stringify(payload) }),
  getQuotation: (id: string) => request<any>(`/api/quotation/${id}`),
  listQuotations: () => request<any[]>("/api/quotation"),

  // PDF — returns a blob URL for sharing
  getPdfUrl: (id: string) => `${BASE_URL}/api/quotation/${id}/pdf`,

  // Design sessions
  listDesignSessions: () => request<any[]>("/api/floor-plan"),

  // Floor plan
  analyzeFloorPlan: async (formData: FormData) => {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/api/floor-plan/analyze`, {
      method: "POST",
      headers: authHeader,
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    return res.json();
  },

  // Design generation
  generateDesign: (payload: GenerateDesignPayload) =>
    request<{ design_url: string }>("/api/design/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceTier {
  tier_name: string;
  min_rate: number;
  low_rate: number;
  high_rate: number;
  currency: string;
  notes: string | null;
}

export interface CatalogItem {
  id: number;
  name: string;
  description: string | null;
  unit: string;
  applicability: string;
  price_tiers: PriceTier[];
}

export interface CatalogCategory {
  id: number;
  name: string;
  sort_order: number;
  items: CatalogItem[];
}

export interface CreateQuotationPayload {
  client_name: string;
  project_address: string;
  project_type: string;
  total_sqft: number;
  rooms: string[];
  line_items: LineItemPayload[];
  design_session_id?: string;
}

export interface LineItemPayload {
  item_id: number;
  item_name: string;
  category: string;
  room: string | null;
  quantity: number;
  unit: string;
  unit_rate: number;
  total_amount: number;
  selected_tier: string;
  notes?: string;
}

export interface GenerateDesignPayload {
  session_id: string;
  style: {
    id: string;
    name: string;
    description: string;
    colors: string[];
    materials: string[];
    forbidden_colors?: string[];
  };
  selected_rooms: string[];
  project_type: string;
  total_sqft: number | null;
}
