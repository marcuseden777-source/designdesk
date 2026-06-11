# Interior Design App — Master Handover

> A mobile-first SaaS tool for interior designers.  
> Automates floor plan design generation and client quotation in one workflow.  
> **Business model:** Monthly subscription + commission on client conversions.

---

## What This App Does

Designers use this tool to:
1. Upload a floor plan → answer a few questions → get a styled top-view design to show clients
2. Build a detailed quotation room-by-room → export a professional PDF

The floor plan feeds into both features. If uploaded, it pre-populates rooms and scopes in the quotation flow so designers don't have to repeat themselves.

---

## Project Status

| Area | Status | Notes |
|---|---|---|
| Product concept | ✅ Done | See docs/01 and docs/02 |
| Design style library | ✅ Done | 20 styles, see docs/04 and database/design_styles.json |
| Quotation database | ✅ Done | 23 categories, 83 items, see database/quotation_database.sql |
| AI prompts | ✅ Done | See ai/ folder |
| Frontend (React Native) | 🔲 Not started | |
| Backend (Node.js API) | 🔲 Not started | |
| LLM integration | 🔲 Not started | |
| PDF generation | 🔲 Not started | |
| Auth / user accounts | 🔲 Not started | |

---

## Tech Stack (Decided)

| Layer | Tool | Alternative |
|---|---|---|
| Mobile app | React Native + Expo | Flutter |
| Backend API | Node.js + Express | Python + FastAPI |
| Database | PostgreSQL + Supabase | Firebase Firestore |
| Image storage | AWS S3 | Google Cloud Storage |
| Auth | Supabase Auth | Firebase Auth |
| Floor plan AI | Claude Vision API | GPT-4 Vision |
| Design generation | DALL-E 3 API | Stable Diffusion |
| PDF export | Puppeteer (Node) | WeasyPrint (Python) |
| Hosting | AWS / Google Cloud Run | Vercel + PlanetScale |

---

## App Flow

```
Login
  └── Dashboard
        ├── DESIGN MODE
        │     └── Upload floor plan
        │           └── MCQ: which area? project type? sqft?
        │                 └── Pick design style (from library)
        │                       └── Generate top-view styled design
        │                             └── Save / share with client
        │
        └── PAPERWORK MODE
              └── MCQ: project type → size → rooms → scope of work
                    └── Room-by-room work item selection
                          └── Preview quotation
                                └── Export PDF
```

If a floor plan was uploaded in Design Mode, it carries over into Paperwork Mode to pre-populate rooms.

---

## Folder Structure

```
interior-design-app/
├── docs/                        ← All planning documents (Word)
├── database/                    ← SQL schema, JSON data, README
├── app/
│   ├── frontend/                ← React Native app (not started)
│   └── backend/                 ← Node.js API (not started)
├── ai/                          ← LLM system prompts
├── assets/
│   ├── style-library/           ← Reference images per design style
│   └── sample-floor-plans/      ← Test floor plans for dev/QA
└── README.md                    ← This file
```

---

## Key Decisions Made

- **Top-view only** — no 3D, no other angles in v1
- **Phase 1:** Pre-built curated styles only (20 styles ready)
- **Phase 2:** Designers can create/customize their own styles
- **Singapore market first** — pricing database is SGD, Singapore renovation rates
- **Quotation is room-by-room** — granular per-room scope selection
- **MCQ-driven UX** — no free text input for core flows, all tap-to-select

---

## Open Items (Still To Decide)

- Exact monthly subscription pricing tiers
- Commission structure and tracking mechanism
- Which specific design styles to launch with first (recommend starting with 3-5)
- Pilot user recruitment — need 3-5 real designers to validate flow
- Whether to support commercial fit-outs in v1 or residential only
- Client-facing view — can clients see designs without logging in?
- Shareable link / approval workflow for client sign-off

---

## How To Resume This In A New Claude Session

Copy and paste this prompt into a new Claude chat:

---

> I am building a mobile-first SaaS application for interior designers in Singapore. Here is the full project context:
>
> **Two core features:**
> 1. **Floor Plan Design Mode** — designer uploads a top-view floor plan image or PDF. An LLM vision model identifies rooms and layout. The designer answers MCQ questions about which areas are being designed, square footage, and project type (condo, landed, HDB). They select a design style from a curated library (20 styles with defined color palettes, materials, and rules). The AI generates a top-view styled design based on the floor plan structure.
> 2. **Quotation / Paperwork Mode** — MCQ-driven flow: project type → size → rooms → scope of work (tiling, flooring, lighting, partition, carpentry, etc.) broken down room by room. If a floor plan was uploaded in Design Mode, it pre-populates rooms. The system generates a professional PDF quotation at the end.
>
> **Business model:** Monthly subscription for designers + commission on client conversions.
>
> **Tech stack:** React Native (frontend), Node.js + Express (backend), PostgreSQL + Supabase (database), Claude Vision or GPT-4 Vision (floor plan analysis), DALL-E 3 (design generation), Puppeteer (PDF export), AWS infrastructure.
>
> **What's already done:**
> - 20-style design library with color palettes, material rules, forbidden colors (see database/design_styles.json)
> - Full PostgreSQL quotation database: 23 categories, 83 line items, price tiers in SGD (see database/quotation_database.sql)
> - All planning docs in docs/ folder
> - AI system prompts in ai/ folder
>
> **What I need next:** [INSERT YOUR NEXT TASK HERE — e.g. "scaffold the React Native app", "build the backend API", "write the floor plan LLM integration", "build the PDF quotation generator"]

---

## Contacts & Context

- **Market:** Singapore residential interior design (primary), commercial fit-out (Phase 2)
- **Target users:** Solo interior designers and small ID firms
- **Currency:** SGD
- **Pricing reference:** Singapore 2024-2025 renovation market rates
