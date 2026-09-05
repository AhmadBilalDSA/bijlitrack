# ⚡ BijliTrack — Smart Electricity Dashboard

A unified, full-stack Next.js web application that helps Pakistani consumers monitor their electricity bills, power outages, feeder status, and complaint history — all from a single, clean dashboard with seamless 1-click hosting on Vercel.

> **Data Source:** All data is fetched from official [CCMS/PITC](https://ccms.pitc.com.pk) public services.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Vercel-Ready-black?logo=vercel)

---

## 🎯 What It Does

| Feature | Description |
|---------|-------------|
| **Bill Dashboard** | View current bill, amount due, due date, units consumed, payment status |
| **Bill History** | 12-month billing history with spending trend charts |
| **Bill Breakdown** | Detailed company charges (energy, fixed, FPA) and govt taxes (GST, ED, FC surcharge) |
| **Power Status** | Real-time feeder ON/OFF status, voltage, power factor |
| **Outage Tracking** | Daily outage monitoring with per-hour breakdown (minutes OFF per hour) |
| **Outage History** | Multi-day outage records with bar charts and PDF export |
| **Complaint Tracking** | Search complaints by reference number or ticket number |
| **Consumer Info** | Name, address, CNIC, meter number, connection type, tariff |
| **Load Schedule** | 24-hour scheduled maintenance grid |
| **AI Reports** | Automated Groq AI-generated consumption insights |
| **Dark/Light Mode** | Full theme support |

---

## 🏗️ Architecture (Unified Next.js Full-Stack)

The project is structured as a **single, unified Next.js 16 application**:

```
BijliTrack/
├── src/
│   ├── app/
│   │   ├── api/                  → Next.js Route Handlers (Serverless Backend)
│   │   │   ├── auth/             → Signup, Login, Password Reset, Profile
│   │   │   ├── reference/        → Track, list, delete reference numbers
│   │   │   ├── dashboard/        → Snapshots, bill history, outage history, AI reports
│   │   │   ├── complaints/       → PITC CCMS complaint scraping
│   │   │   └── cron/             → Vercel Cron automated daily tracking
│   │   ├── dashboard/            → Protected dashboard pages
│   │   ├── (auth)/               → Login, signup, password recovery
│   │   ├── layout.tsx            → Root layout & providers
│   │   └── page.tsx              → Landing page
│   ├── components/               → UI components (shadcn/ui + Radix + Tailwind 4)
│   ├── hooks/                    → Custom React hooks (useAuth)
│   └── lib/
│       ├── api.ts                → Axios client (same-origin /api calls)
│       ├── ccms.ts               → Direct client-side CCMS fetcher
│       └── server/               → Serverless utilities (Mongoose, Auth, Services)
│           ├── db.ts             → Cached MongoDB connection pooling
│           ├── auth.ts           → JWT token validation & bcryptjs
│           ├── models/           → Mongoose schemas (User, Reference, Bill, Outage, etc.)
│           └── services/         → CCMS scraping, Nodemailer, Outage synchronization
├── public/                       → Static assets
├── vercel.json                   → Vercel Cron configuration
└── package.json                  → Dependencies & build scripts
```

### Key Highlights
- **No Separate Backend Server Needed**: The API runs as native Next.js Route Handlers (`/api/*`) on Vercel Serverless Functions.
- **Zero CORS Issues**: All client requests resolve directly to `/api/...` on the same domain.
- **Automated Outage Cron Job**: Uses Vercel Cron (`vercel.json`) to trigger daily tracking without needing a 24/7 background process.

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18+
- MongoDB database (local or MongoDB Atlas)

### Installation

```bash
# Clone the repository
git clone https://github.com/ahmmikun/Lesco-Electricity-Moniter.git
cd Lesco-Electricity-Moniter

# Install all dependencies
npm install
```

### Environment Configuration

Create a `.env.local` file in the root directory (or copy from `.env.example`):

```env
# MongoDB Atlas Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/bijlitrack?retryWrites=true&w=majority

# JWT Secret for Session Authentication
JWT_SECRET=your-secure-random-jwt-secret-key-here

# Optional: Groq API Key for AI Analysis Reports
GROQ_API_KEY=gsk_your_groq_api_key

# Optional: Vercel Cron authorization secret
CRON_SECRET=your-random-cron-secret-token

# Optional: SMTP Email service for password reset emails
APP_NAME=BijliTrack
MAIL_FROM="BijliTrack <no-reply@example.com>"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application and APIs.

---

## 🚢 Deploying to Vercel (1-Click)

Because BijliTrack is a standard unified Next.js project, deploying to Vercel requires zero complex setup:

1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your **BijliTrack** repository (Vercel will automatically detect **Next.js**).
4. Add the following **Environment Variables** in the Vercel dashboard:
   - `MONGODB_URI` — Your MongoDB Atlas connection string
   - `JWT_SECRET` — A secure random string for JWT token generation
   - `GROQ_API_KEY` (Optional) — For AI report generation
   - `CRON_SECRET` (Optional) — Secret to protect the `/api/cron/daily-tracker` endpoint
   - SMTP variables (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, etc., optional for password resets)
5. Click **Deploy**.

That's it! Your entire full-stack application (frontend + API + database connection + cron jobs) is live.

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login, get JWT |
| POST | `/api/auth/forgot-password` | Email password reset link |
| POST | `/api/auth/reset-password` | Set new password from reset token |
| GET | `/api/auth/me` | Get current user (protected) |

### Reference Management (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reference/track` | Start tracking a reference number |
| GET | `/api/reference/my` | Get user's tracked references |
| DELETE | `/api/reference/:id` | Remove tracked reference + all data |

### Dashboard (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/:refId` | Get latest saved snapshot |
| POST | `/api/dashboard/:refId/save` | Save CCMS data snapshot |
| GET | `/api/dashboard/:refId/billing` | Bill history records |
| GET | `/api/dashboard/:refId/outages` | Outage history with hourly data |
| GET | `/api/dashboard/:refId/report` | Latest AI analysis report |
| POST | `/api/dashboard/:refId/report/generate` | Generate AI report (Groq) |

### Complaints (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/complaints/track-by-reference?referenceNo=...` | Complaint history by reference |
| GET | `/api/complaints/track-by-ticket?ticketNo=...` | Track by ticket number |

### Cron
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cron/daily-tracker` | Daily outage synchronization job (Vercel Cron) |

---

## 🌐 Supported DISCOs

BijliTrack works with all PITC/CCMS supported public-sector DISCOs:

`LESCO` `GEPCO` `FESCO` `IESCO` `MEPCO` `PESCO` `HESCO` `SEPCO` `QESCO` `TESCO` `AJ&K`

> ⚠️ **K-Electric is NOT supported** as it uses a separate private infrastructure.

---

## ⚠️ Disclaimer

BijliTrack is an **independent utility dashboard**. It is NOT an official government website and is NOT affiliated with PITC, WAPDA, or any electricity distribution company.

Data is collected from publicly available official CCMS/PITC services. We do not own, modify, or guarantee the accuracy of the official data.

---

## 📄 License

ISC
