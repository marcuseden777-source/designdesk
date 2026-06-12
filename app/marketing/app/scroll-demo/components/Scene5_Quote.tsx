"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { SCENES, useScrollProgress } from "../hooks/useScrollProgress";
import { FloatingPanels } from "./assets";

/**
 * Scene 5 — generated interiors drift at staggered depths behind the
 * floating quote card, like the designs the quote was built from.
 */
export default function Scene5Quote() {
  return (
    <FloatingPanels
      slugs={["japandi", "wabi-sabi", "scandinavian", "biophilic"]}
      placements={[
        { position: [-2.6, 0.9, -2.2], rotationY: 0.35, scale: 1 },
        { position: [2.7, 0.4, -3], rotationY: -0.3, scale: 1.15 },
        { position: [-1.8, -0.8, -4.2], rotationY: 0.2, scale: 1.3 },
        { position: [2, -1.2, -5], rotationY: -0.15, scale: 1.35 },
      ]}
      visibleWhen={(p) => p >= SCENES.quote.start && p < SCENES.quote.end}
      opacity={0.55}
    />
  );
}

const LINE_ITEMS = [
  { icon: "📐", label: "Floor area", id: "area" },
  { icon: "🎨", label: "Style", id: "style" },
  { icon: "🪑", label: "Materials", id: "materials" },
  { icon: "👷", label: "Labour", id: "labour" },
  { icon: "💰", label: "Total", id: "total" },
] as const;

/** HTML overlay — receipt-print quote card with staggered counters. */
export function Scene5Overlay() {
  const p = useScrollProgress();
  const inScene = p >= SCENES.quote.start && p < SCENES.quote.end + 0.02;

  const cardRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLSpanElement>(null);
  const materialsRef = useRef<HTMLSpanElement>(null);
  const labourRef = useRef<HTMLSpanElement>(null);
  const totalRef = useRef<HTMLSpanElement>(null);
  const played = useRef(false);

  useEffect(() => {
    if (p < SCENES.quote.start + 0.02 || played.current || !cardRef.current) {
      return;
    }
    played.current = true;

    const rows = cardRef.current.querySelectorAll("[data-quote-row]");
    gsap.fromTo(
      rows,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.15, duration: 0.5, ease: "power2.out" }
    );

    const values = { area: 0, materials: 0, labour: 0, total: 0 };
    const money = (n: number) => `S$${Math.round(n).toLocaleString("en-SG")}`;
    gsap.to(values, {
      area: 85,
      materials: 12400,
      labour: 8200,
      total: 20600,
      duration: 1.6,
      delay: 0.3,
      ease: "power1.out",
      onUpdate: () => {
        if (areaRef.current) {
          areaRef.current.textContent = `${Math.round(values.area)} sqm`;
        }
        if (materialsRef.current) {
          materialsRef.current.textContent = money(values.materials);
        }
        if (labourRef.current) {
          labourRef.current.textContent = money(values.labour);
        }
        if (totalRef.current) {
          totalRef.current.textContent = money(values.total);
        }
      },
    });
  }, [p]);

  const valueFor = (id: (typeof LINE_ITEMS)[number]["id"]) => {
    switch (id) {
      case "area":
        return (
          <span ref={areaRef} className="font-medium text-slate-200">
            0 sqm
          </span>
        );
      case "style":
        return <span className="font-medium text-slate-200">Japandi</span>;
      case "materials":
        return (
          <span ref={materialsRef} className="font-medium text-slate-200">
            S$0
          </span>
        );
      case "labour":
        return (
          <span ref={labourRef} className="font-medium text-slate-200">
            S$0
          </span>
        );
      case "total":
        return (
          <span ref={totalRef} className="text-xl font-bold text-teal-300">
            S$0
          </span>
        );
    }
  };

  return (
    <div
      className="sticky top-0 flex h-screen items-center justify-center px-6 transition-opacity duration-300"
      style={{ opacity: inScene ? 1 : 0 }}
    >
      <div
        ref={cardRef}
        className="w-full max-w-[375px] rounded-2xl border border-slate-700 bg-[#111118] p-6 shadow-2xl shadow-teal-500/10"
      >
        <h3 className="text-lg font-semibold text-teal-400">
          💡 DesignDesk Quote
        </h3>
        <div className="mt-5 space-y-4">
          {LINE_ITEMS.map((item) => (
            <div
              key={item.id}
              data-quote-row
              className={`flex items-center justify-between ${
                item.id === "total"
                  ? "border-t border-dashed border-slate-700 pt-4"
                  : ""
              }`}
            >
              <span className="text-sm text-slate-400">
                {item.icon} {item.label}
              </span>
              {valueFor(item.id)}
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm italic text-slate-400">
          Quote ready before the client hangs up.
        </p>
      </div>
    </div>
  );
}
