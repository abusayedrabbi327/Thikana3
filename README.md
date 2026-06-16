# Thikana Marketplace

Thikana is a comprehensive real estate rental, sale, and product marketplace platform. It allows users to browse, list, buy, sell, and rent products or properties. The application features full role-based access controls, NID identity verification powered by optical character recognition (OCR), real-time messaging supporting multimedia attachments, and intelligent AI assistant recommendations.

## Core Features

- Multi-Category Marketplace: Dedicated listing pipelines for furniture, home appliances, flats for sale, and houses for rent.
- Role-Based Access Control: Specialized user dashboards tailored for Buyers, Sellers, and Administrators.
- Real-Time Messaging: Integrated communication system powered by Socket.io, supporting text, image, and voice messages.
- Identity Verification: NID validation workflow incorporating Tesseract OCR text extraction and selfie face match scoring.
- AI Assistant: Intelligent conversational recommendations and product comparisons powered by Google Gemini 2.5 Flash.
- Order and Booking Management: Shopping cart, checkout processing, and advance property booking systems.
- Moderation Console: Interactive admin console for user management, KYC verification, product moderation, and activity tracking.
- Interactive Maps: OpenStreetMap integration via Leaflet for precise geocoding of property locations.

## Tech Stack

### Frontend
- Core Framework: React 19 (Vite)
- Styling: Vanilla CSS and Tailwind CSS
- State Management: React Context API
- Router: React Router DOM
- Mapping: Leaflet & React Leaflet
- Real-Time Communication: Socket.io Client
- Icon Pack: Lucide React

### Backend
- Runtime Environment: Node.js
- Framework: Express.js
- Database: PostgreSQL (via pg pool connected to Supabase)
- Real-Time Server: Socket.io
- OCR & Imaging: Tesseract.js & Multer
- Email Delivery: Nodemailer
- Authentication: JSON Web Token (JWT) & Bcryptjs

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- PostgreSQL database instance (local or hosted on Supabase)
- SMTP account configuration (e.g. Gmail App Password for email notifications)
- Google Gemini API Key (for the AI recommendation assistant)

### Installation

1. Clone the Repository
   ```bash
   git clone https://github.com/Spectre07Siuuu/Thikana.git
   cd Thikana
   ```

2. Frontend Dependencies Setup
   ```bash
   npm install
   ```

3. Backend Dependencies Setup
   ```bash
   cd server
   npm install
   ```

### Environment Configuration

Create a `.env` file inside the `server/` directory. Refer to `server/.env.example` as a template:

```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
PORT=5000
CLIENT_URL=http://localhost:5173

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username@gmail.com
SMTP_PASS=your_smtp_app_password
SMTP_FROM="Thikana Marketplace" <your_smtp_username@gmail.com>

GEMINI_API_KEY=your_google_gemini_api_key
```

### Database Initialization & Migration

1. Run the database migration script to construct all database tables:
   ```bash
   cd server
   npm run migrate
   ```

2. Seed realistic demo data (Users, Admin, and 100+ listings with precise mapping coordinates):
   ```bash
   npm run seed:fresh
   ```

### Running the Application

Both the frontend client and backend server must run concurrently.

#### Start Backend Service
```bash
cd server
npm run dev
```

#### Start Frontend Client
From the root directory:
```bash
npm run dev
```

The application will be accessible at `http://localhost:5173`.

## Login Credentials for Testing

Use the following seeded accounts to verify different roles in the platform:

| Role | Email | Password |
| :--- | :--- | :--- |
| Admin | admin@thikana.com | 223236 |
| Seller | iqram@gmail.com | 123456 |
| Buyer | sazzad@gmail.com | 123456 |

## Project Structure

```text
Thikana/
├── server/                 # Express.js Backend
│   ├── config/             # Database and application configuration
│   ├── controllers/        # Route logic and handlers
│   ├── db/                 # SQL schemas, migrations, and database seeders
│   ├── middleware/         # Auth, role-checks, and error limiters
│   ├── routes/             # REST API routes
│   └── services/           # External service layers (AI, KYC, Emails)
└── src/                    # React Frontend
    ├── components/         # Reusable UI components
    ├── context/            # Global state context providers
    ├── pages/              # Primary route view components
    └── services/           # Frontend fetch wrapper and API actions
```

## Available Scripts

Inside the `server/` directory, you can run the following helper scripts:
- `npm run dev`: Starts the backend using Nodemon for hot-reloads.
- `npm run start`: Starts the production backend.
- `npm run migrate`: Executes schema migration script against PostgreSQL.
- `npm run seed:fresh`: Fully clears and seeds a fresh set of realistic mock data.
- `npm run seed:realistic`: Randomizes and updates all product marketplace data while keeping user accounts intact.
