# Thikana 🏠

**Thikana** is a comprehensive product marketplace and property listing platform. It allows users to buy, sell, and rent items and properties with ease. The platform features role-based access control, real-time messaging, secure transactions, and NID verification for enhanced trust and safety.

## 🚀 Features

- **Multi-Category Marketplace**: Support for furniture, appliances, electronics, house rentals, and more.
- **Role-Based Access**: Specialized functionality for **Buyers**, **Sellers**, and **Admins**.
- **Real-Time Communication**: Integrated chat system powered by Socket.io, supporting text and voice messages.
- **Identity Verification**: Built-in NID verification pipeline to ensure user authenticity.
- **Order Management**: Shopping cart system, checkout process, and order tracking.
- **Product Reviews**: Verified buyer review and rating system.
- **Admin Dashboard**: Tools for managing users, approving listings, and monitoring platform activity.
- **Responsive Design**: Modern and sleek UI built with Tailwind CSS.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Icons**: Lucide React
- **Real-time**: Socket.io-client

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **Real-time**: Socket.io
- **File Handling**: Multer
- **Email**: Nodemailer
- **Authentication**: JWT & Bcryptjs

## 📦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (Latest LTS)
- [XAMPP](https://www.apachefriends.org/) (for MySQL)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Spectre07Siuuu/Thikana.git
   cd Thikana
   ```

2. **Frontend Setup**
   ```bash
   # Install dependencies
   npm install

   # Run development server
   npm run dev
   ```

3. **Backend Setup**
   ```bash
   cd server
   
   # Install dependencies
   npm install
   ```

### ⚙️ Environment Configuration

Create a `.env` file in the `server` directory based on `.env.example`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=thikana_db
JWT_SECRET=your_jwt_secret
```

### 🗄️ Database Setup

1. Start **Apache** and **MySQL** via XAMPP.
2. Create a database named `thikana_db` in phpMyAdmin.
3. Run the migrations:
   ```bash
   cd server
   npm run migrate
   ```
4. (Optional) Seed initial data:
   ```bash
   node seed_realistic.js
   ```

5. **Start the backend server**
   ```bash
   npm run dev
   ```

## 📂 Project Structure

```text
Thikana/
├── server/             # Express.js Backend
│   ├── config/         # Database and app config
│   ├── controllers/    # Route controllers
│   ├── db/             # Migrations and seeders
│   ├── routes/         # API endpoints
│   └── uploads/        # User-uploaded images/audio
└── src/                # React Frontend
    ├── components/     # Reusable UI components
    ├── context/        # State management (Auth, Cart)
    ├── pages/          # Page components
    └── services/       # API interaction layer
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🗺️ Future Roadmap

- **Automated NID Verification**: Integration with OCR APIs (like Google Cloud Vision or specialized local APIs) to automate identity validation.
- **Dynamic Delivery API**: Integration with local logistics providers (e.g., RedX, Pathao) for real-time delivery fee calculation and automated courier booking.
- **Payment Gateway Integration**: Adding support for SSLCommerz, Stripe, or bKash PGW to enable automated online payments.
- **Advanced Admin Controls**: User suspension, fine-grained role management, and dispute resolution dashboards.
