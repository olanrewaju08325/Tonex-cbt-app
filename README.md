# 🏆 Tonex CBT

Tonex CBT is a premium, unified Computer-Based Testing (CBT) and examination prep engine designed specifically for UTME, JAMB, and Post-UTME aspirants in Nigeria. 

This platform delivers a high-fidelity exam simulation experience mimicking actual university screening environments, complete with comprehensive performance analytics, automated study tools, and multi-tier subscription gating.

---

## 🚀 Key Features

### 1. Real-time CBT Exam Simulator
* **Real UTME/JAMB Sandbox**: Practice under realistic constraints with support for up to 4 subjects simultaneously, custom timings, and real-time navigation dashboards.
* **Results Analytics**: Instant scoring, detailed feedback on correct/incorrect choices, and direct textbook references for explanation.
* **Review & Bookmark System**: Save difficult questions to study later, with optional notes and step-by-step review pathways.

### 2. PWA Offline Mode (IndexedDB Caching & Auto-Sync)
Designed to operate reliably in low-connectivity areas across Nigeria:
* **Subject Downloads**: Premium users can download complete subject question banks (up to 100 questions per subject) to practice entirely offline.
* **Local Question Fallback**: Seamless fallback to client-side IndexedDB when network requests to Supabase fail or time out.
* **Offline Result Queueing**: Saves exam session results locally if a student completes a test while offline.
* **Auto-Sync Engine**: Registers a global listener on the browser's `online` event to automatically synchronize all queued offline sessions to Supabase once connection is restored.

### 3. Subscription Tiers & Feature Gating
* **Free Plan Limits**:
  * Limited to 5 practice questions per subject daily.
  * Capt at practicing a maximum of 4 subjects total (new subjects remain locked).
  * Display of a dynamic countdown timer showing when the daily practice limits reset (resetting at UTC midnight).
* **Locked & Blurred Premium Modules**:
  * **Locked Pages**: Navigating to *Full Exam Mode*, *Bookmarks*, or *Challenges* pages redirects free users to subscription plans.
  * **Leaderboard Gating**: Free users can see only the top 3 global positions. All lower ranks are blurred, and filterable university leaderboards are locked.
  * **Analytics Gating**: Core summaries are visible, but detailed radial performance gauges, score trend charts, topic weaknesses, and session history tables are blurred behind an unlock CTA.
* **Active Plan Sidebar Corner**: Renders active subscription status, plan name, and expiry date directly in the student dashboard, dynamically managing plan auto-cancellations.

### 4. Interactive Learning Tools
* **Flashcard Registry**: Dynamic study decks with interactive 3D flipping styles (using CSS transforms and perspective styling) for rapid memorization.
* **Announcements & Streaks**: Student portal keeps users engaged using streak tracking (daily practice triggers) and global admin announcements banners.
* **Priority Coaching WhatsApp Flow**: Connects Quarterly/Yearly members directly to pre-filled support queues and 1-on-1 performance coaches via WhatsApp API links.

### 5. AI-Powered Explanations
* **Step-by-Step AI Tutoring**: Integrates with the Google Gemini API to return structured Markdown explanations breaking down complex questions, answers, and syllabus concepts.
* **Secure Key Fallback**: Gracefully defaults to a beautiful "Coming Soon" placeholder if the Gemini API key is not set, enabling instant activation once added.

### 6. Administrative Dashboard
* **Question & Syllabus Management**: Bulk CSV uploads parsed using PAPA Parse, with automated schema validation.
* **Flashcard Registry Management**: Full CRUD operations to add, modify, or remove cards from standard study decks.
* **Subscription Management**: Access control panel to review user logs, view site revenues, and manually update user subscription tiers.

---

## 🛠️ Technology Stack

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React (Icons), Shadcn UI, Recharts (Data Visualizations), PapaParse (CSV Processing).
* **Database & Auth**: Supabase (PostgreSQL), GoTrue Auth, Row-Level Security (RLS) policies, Custom PL/pgSQL database functions and triggers.
* **Offline Caching**: Workbox Service Worker caching (static resources), Client-side IndexedDB (dynamic question banks/sessions).
* **Hosting & Deployment**: Vercel.

---

## 📂 Folder Directory Layout

```
tonex/
├── src/
│   ├── app/
│   │   ├── components/       # Reusable components (admin panel views, UI layouts)
│   │   │   ├── admin/        # Admin panel tabs (Uploads, Revenue, Settings)
│   │   │   └── ui/           # Custom Shadcn UI base components
│   │   ├── pages/            # Page screens (Dashboard, ExamPage, PracticePage)
│   │   └── routes.tsx        # Application routing definitions
│   ├── contexts/             # React Context providers (AuthContext, ThemeContext)
│   ├── lib/                  # Library configurations and helpers
│   │   ├── hooks/            # Custom hooks (useQuestions, useSubscription, etc.)
│   │   ├── gemini.ts         # Gemini AI API wrapper logic
│   │   ├── offlineCache.ts   # IndexedDB schema, write/read operations, and sync
│   │   └── supabase.ts       # Supabase client instantiation
│   ├── styles/               # Index stylesheets, fonts, and tailwind settings
│   └── main.tsx              # Application entry point
├── public/                   # Static icons, banners, manifest, and logos
├── supabase/
│   ├── migrations/           # Database migration files (.sql schemas & policies)
│   └── seed.sql              # Seed SQL scripts
├── vercel.json               # Vercel routing, caching, and security headers
└── vite.config.ts            # Vite compiler configuration
```

---

## 💻 Local Setup & Development

### 1. Prerequisites
Make sure you have **Node.js** (v18 or higher) and **npm** installed.

### 2. Clone and Install
Clone the repository and install all node modules:
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root folder of the project. Note: **never commit this file to public repository branches.**
```properties
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key

# Admin Setup Credentials (Optional)
SUPERADMIN_EMAIL=your_superadmin_auth_email
SUPERADMIN_PASSWORD=your_superadmin_auth_password

# Payment Gate Details (Manual Bank Transfer Display)
ACCOUNT_NUMBER=your_bank_account_number
ACCOUNT_HOLDER_NAME=your_bank_account_holder_name
ACCOUNT_BANK_NAME=your_bank_name

# AI Tutoring Engine (Optional)
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 4. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### 5. Build for Production
To bundle the project for production optimization and compile the PWA static service worker:
```bash
npm run build
```
Compiled resources will be placed in the `dist/` directory.

---

## 🔒 Security Best Practices

* **Row-Level Security (RLS)**: PostgreSQL tables use explicit policies so users can only view their own exam sessions, subscription details, and bookmarks.
* **API Secrets**: All administrative keys, Database secret service roles, and Gemini keys are fetched strictly from runtime environment variables. Never expose them directly inside client-side source code.
* **Sanitized CSV Ingestion**: CSV uploads are verified client-side to prevent script injection before database storage.