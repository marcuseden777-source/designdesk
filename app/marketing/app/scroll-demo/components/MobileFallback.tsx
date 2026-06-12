"use client";

import { useEffect, useRef, useState } from "react";
import { DASHBOARD_URL } from "./Scene7_CTA";

const CARDS: {
  gradient: string;
  image?: string;
  headline: string;
  sub: string;
  cta?: boolean;
}[] = [
  {
    gradient: "from-slate-900 via-blue-950 to-slate-900",
    image: "/textures/blueprint.webp",
    headline: "Drop your floor plan.",
    sub: "Get 20 designs in seconds.",
  },
  {
    gradient: "from-slate-900 via-amber-950 to-slate-900",
    image: "/textures/styles/industrial.webp",
    headline: "Upload in one tap.",
    sub: "Traditional way: 3–5 days. DesignDesk: under 2 minutes.",
  },
  {
    gradient: "from-teal-950 via-slate-900 to-purple-950",
    image: "/textures/styles/japandi.webp",
    headline: "20 styles, instantly.",
    sub: "Scandinavian to Japandi — every style generated in seconds.",
  },
  {
    gradient: "from-slate-800 via-slate-900 to-teal-950",
    image: "/textures/room-after.webp",
    headline: "Before → After.",
    sub: "Weeks of back-and-forth become a two-minute reveal.",
  },
  {
    gradient: "from-slate-900 via-emerald-950 to-slate-900",
    image: "/textures/styles/scandinavian.webp",
    headline: "Quote on the spot.",
    sub: "Area, materials, labour, total — ready before the client hangs up.",
  },
  {
    gradient: "from-red-950 via-slate-900 to-green-950",
    image: "/textures/styles/wabi-sabi.webp",
    headline: "8 steps become 3.",
    sub: "Measure–draft–revise–revise–revise… or just Upload → Generate → Quote.",
  },
  {
    gradient: "from-teal-950 via-purple-950 to-slate-900",
    image: "/textures/styles/biophilic.webp",
    headline: "Your design. Your quote. Instantly.",
    sub: "Start designing free today.",
    cta: true,
  },
];

function FallbackCard({
  card,
  index,
}: {
  card: (typeof CARDS)[number];
  index: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(index === 0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setSeen(true);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`relative flex h-screen w-full snap-start flex-col items-center justify-center overflow-hidden bg-gradient-to-br px-8 text-center ${card.gradient}`}
    >
      {card.image && (
        <div
          aria-hidden
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage: `url(${card.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/40 to-ink/70"
      />
      <div className={`relative ${seen ? "animate-slide-up" : "opacity-0"}`}>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-400">
          {String(index + 1).padStart(2, "0")} / 07
        </p>
        <h2 className="mt-6 text-3xl font-bold leading-tight text-white">
          {card.headline}
        </h2>
        <p className="mx-auto mt-4 max-w-xs text-base text-slate-300">
          {card.sub}
        </p>
        {card.cta && (
          <a
            href={DASHBOARD_URL}
            className="mt-10 inline-block rounded-full bg-gradient-to-r from-teal-500 to-purple-600 px-8 py-4 text-lg font-semibold text-white"
          >
            Start Designing Free →
          </a>
        )}
        {!card.cta && index === 0 && (
          <p className="mt-10 text-sm text-slate-500">Swipe up ↑</p>
        )}
      </div>
    </section>
  );
}

/**
 * Lightweight CSS scroll-snap experience for devices that can't run the
 * WebGL canvas (no WebGL, or small screen on a 2g connection).
 */
export default function MobileFallback() {
  return (
    <div className="fixed inset-0 snap-y snap-mandatory overflow-y-auto bg-ink">
      {CARDS.map((card, i) => (
        <FallbackCard key={card.headline} card={card} index={i} />
      ))}
    </div>
  );
}
