"use client";

import { useEffect, useRef, useState } from "react";
import { DASHBOARD_URL } from "./Scene7_CTA";
import { IconArrowRight, IconArrowDown } from "./icons";

const CARDS: {
  gradient: string;
  image?: string;
  headline: string;
  sub: string;
  cta?: boolean;
}[] = [
  {
    gradient: "from-ink via-[#221a13] to-ink",
    image: "/textures/blueprint.webp",
    headline: "Drop your floor plan.",
    sub: "Get 20 designs in seconds.",
  },
  {
    gradient: "from-ink via-[#2a1d12] to-ink",
    image: "/textures/styles/industrial.webp",
    headline: "Upload in one tap.",
    sub: "Traditional way: 3–5 days. DesignDesk: under 2 minutes.",
  },
  {
    gradient: "from-[#1e1712] via-ink to-[#261a13]",
    image: "/textures/styles/japandi.webp",
    headline: "20 styles, instantly.",
    sub: "Scandinavian to Japandi — every style generated in seconds.",
  },
  {
    gradient: "from-[#241a13] via-ink to-[#1d1712]",
    image: "/textures/room-after.webp",
    headline: "Before → After.",
    sub: "Weeks of back-and-forth become a two-minute reveal.",
  },
  {
    gradient: "from-ink via-[#231a13] to-ink",
    image: "/textures/styles/scandinavian.webp",
    headline: "Quote on the spot.",
    sub: "Area, materials, labour, total — ready before the client hangs up.",
  },
  {
    gradient: "from-ink via-[#241b14] to-ink",
    image: "/textures/styles/wabi-sabi.webp",
    headline: "8 steps become 3.",
    sub: "Measure–draft–revise–revise–revise… or just Upload → Generate → Quote.",
  },
  {
    gradient: "from-[#2c1a12] via-[#1f1410] to-ink",
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
      className={`relative flex h-[100dvh] w-full snap-start flex-col items-center justify-center overflow-hidden bg-gradient-to-br px-8 text-center ${card.gradient}`}
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
      <div
        className={`relative motion-reduce:!opacity-100 motion-reduce:!animate-none ${
          seen ? "animate-slide-up" : "opacity-0"
        }`}
      >
        <p className="font-sans text-sm font-semibold uppercase tracking-[0.35em] text-terracotta-soft">
          {String(index + 1).padStart(2, "0")} / 07
        </p>
        <h2 className="mt-6 font-serif text-4xl font-semibold leading-tight text-off-white">
          {card.headline}
        </h2>
        <p className="mx-auto mt-4 max-w-xs font-sans text-base text-stone">
          {card.sub}
        </p>
        {card.cta && (
          <a
            href={DASHBOARD_URL}
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-terracotta px-8 py-4 font-sans text-base font-semibold text-off-white shadow-lg shadow-terracotta/25"
          >
            Start Designing Free
            <IconArrowRight className="h-5 w-5" />
          </a>
        )}
        {!card.cta && index === 0 && (
          <p className="mt-10 inline-flex items-center gap-1.5 font-sans text-sm text-stone-dim">
            Swipe up
            <IconArrowDown className="h-4 w-4 rotate-180" />
          </p>
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
