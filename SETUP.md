# 🏠 Thikana Marketplace - Full Setup Guide

Welcome to the **Thikana Marketplace** setup guide. Follow these steps to get the project running on a new machine.

## 🛠 Prerequisites

Ensure you have the following installed:
1.  **XAMPP**: [Download here](https://www.apachefriends.org/download.html) (For MySQL Database)
2.  **Node.js**: [Download here](https://nodejs.org/) (v18 or higher recommended)
3.  **Git**: [Download here](https://git-scm.com/)

---

## 📂 Step 1: Clone the Project

Open your terminal and run:
```bash
git clone https://github.com/Spectre07Siuuu/Thikana.git
cd Thikana
```

---

## 🗄 Step 2: Database Setup (MySQL)

1.  Start **XAMPP Control Panel**.
2.  Start **Apache** and **MySQL** modules.
3.  Open **phpMyAdmin** (`http://localhost/phpmyadmin`) in your browser.
4.  Create a new database named **`thikana_db`**.
5.  Click on the **Import** tab.
6.  Choose the file: `server/db/init.sql` and click **Import/Go**.

---

## ⚙️ Step 3: Backend Configuration

1.  Navigate to the server directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Setup Environment Variables:
    *   Find `.env.example` in the `server` folder.
    *   Rename it to `.env`.
    *   Verify your database credentials:
        ```env
        DB_HOST=localhost
        DB_USER=root
        DB_PASS=
        DB_NAME=thikana_db
        JWT_SECRET=your_secret_key_here
        ```

---

## 🎨 Step 4: Frontend Configuration

1.  Go back to the root directory:
    ```bash
    cd ..
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

---

## 🌱 Step 5: Seed the Database

To populate the marketplace with high-quality demo data (Users, Admin, and 100+ Products with precise map pins):

1.  Go to the `server` folder:
    ```bash
    cd server
    ```
2.  Run the unified seed command:
    ```bash
    npm run seed:fresh
    ```

---

## 🚀 Step 6: Running the Application

You need to run both the **Backend** and **Frontend** simultaneously.

### Terminal 1: Backend
```bash
cd server
npm run dev
```

### Terminal 2: Frontend
```bash
# From the root Thikana folder
npm run dev
```

---

## 🔑 Login Credentials (Demo)

After seeding with `npm run seed:fresh`, you can use these accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@thikana.com` | `223236` |
| **Seller** | `iqram@gmail.com` | `123456` |
| **Buyer** | `sazzad@gmail.com` | `123456` |

---

## 🗺 Map Usage
*   **Upload Page**: Click the map pin icon inside the Location field to expand the map.
*   **Current Location**: Use the "Use My Current Location" button on the map for instant pinpointing.
*   **Note**: An internet connection is required to load the map tiles from OpenStreetMap.

---

## 📝 Common Commands
*   `npm run migrate`: Run database migrations.
*   `npm run seed:fresh`: Wipe and create a fresh demo environment.
*   `npm run seed:realistic`: Keep users but randomize all product data.
