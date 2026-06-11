import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import { api, CatalogCategory, LineItemPayload } from "./api";

// ─── State shape ──────────────────────────────────────────────────────────────

export interface QuoteState {
  // Step 1 — Project info
  client_name: string;
  project_address: string;
  project_type: "hdb" | "condo" | "landed" | "commercial" | "";
  total_sqft: number | null;

  // Step 2 — Rooms
  rooms: string[];

  // Step 3 — Scope (room → selected items)
  line_items: LineItemPayload[];

  // Catalog (fetched once)
  catalog: CatalogCategory[];
  catalogLoading: boolean;
  catalogError: string | null;

  // From design mode (optional pre-population)
  design_session_id?: string;
}

type Action =
  | { type: "SET_CLIENT"; client_name: string; project_address: string }
  | { type: "SET_PROJECT"; project_type: QuoteState["project_type"]; total_sqft: number }
  | { type: "SET_ROOMS"; rooms: string[] }
  | { type: "ADD_LINE_ITEM"; item: LineItemPayload }
  | { type: "REMOVE_LINE_ITEM"; item_id: number; room: string | null }
  | { type: "UPDATE_QUANTITY"; item_id: number; room: string | null; quantity: number }
  | { type: "SET_CATALOG"; catalog: CatalogCategory[] }
  | { type: "SET_CATALOG_LOADING"; loading: boolean }
  | { type: "SET_CATALOG_ERROR"; error: string }
  | { type: "SET_SESSION_ID"; design_session_id: string }
  | { type: "RESET" };

const initialState: QuoteState = {
  client_name: "",
  project_address: "",
  project_type: "",
  total_sqft: null,
  rooms: [],
  line_items: [],
  catalog: [],
  catalogLoading: false,
  catalogError: null,
};

function reducer(state: QuoteState, action: Action): QuoteState {
  switch (action.type) {
    case "SET_CLIENT":
      return { ...state, client_name: action.client_name, project_address: action.project_address };
    case "SET_PROJECT":
      return { ...state, project_type: action.project_type, total_sqft: action.total_sqft };
    case "SET_ROOMS":
      return { ...state, rooms: action.rooms };
    case "ADD_LINE_ITEM":
      return { ...state, line_items: [...state.line_items, action.item] };
    case "REMOVE_LINE_ITEM":
      return {
        ...state,
        line_items: state.line_items.filter(
          (i) => !(i.item_id === action.item_id && i.room === action.room)
        ),
      };
    case "UPDATE_QUANTITY": {
      return {
        ...state,
        line_items: state.line_items.map((i) =>
          i.item_id === action.item_id && i.room === action.room
            ? { ...i, quantity: action.quantity, total_amount: action.quantity * i.unit_rate }
            : i
        ),
      };
    }
    case "SET_CATALOG":
      return { ...state, catalog: action.catalog, catalogLoading: false };
    case "SET_CATALOG_LOADING":
      return { ...state, catalogLoading: action.loading };
    case "SET_CATALOG_ERROR":
      return { ...state, catalogError: action.error, catalogLoading: false };
    case "SET_SESSION_ID":
      return { ...state, design_session_id: action.design_session_id };
    case "RESET":
      return { ...initialState, catalog: state.catalog };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const QuoteContext = createContext<{
  state: QuoteState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: "SET_CATALOG_LOADING", loading: true });
    api.getCatalog()
      .then((catalog) => dispatch({ type: "SET_CATALOG", catalog }))
      .catch((err) => dispatch({ type: "SET_CATALOG_ERROR", error: err.message }));
  }, []);

  return (
    <QuoteContext.Provider value={{ state, dispatch }}>
      {children}
    </QuoteContext.Provider>
  );
}

export function useQuote() {
  const ctx = useContext(QuoteContext);
  if (!ctx) throw new Error("useQuote must be used inside QuoteProvider");
  return ctx;
}

// ─── Derived helpers ──────────────────────────────────────────────────────────

export function getSubtotal(items: LineItemPayload[]) {
  return items.reduce((sum, i) => sum + i.total_amount, 0);
}

export function formatSGD(amount: number) {
  return `S$${amount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
