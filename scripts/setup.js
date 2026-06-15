import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
    red: "\x1b[31m"
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

async function setup() {
    log("🏠 Welcome to Thikana Marketplace Setup", colors.bright + colors.cyan);
    log("========================================", colors.cyan);

    try {
        // 1. Check Node.js version
        const nodeVersion = process.versions.node.split('.')[0];
        if (parseInt(nodeVersion) < 18) {
            throw new Error("Node.js version 18 or higher is required.");
        }
        log("✅ Node.js version check passed", colors.green);

        // 2. Install Root Dependencies (Frontend)
        log("\n📦 Installing frontend dependencies...", colors.yellow);
        execSync('npm install', { stdio: 'inherit', cwd: rootDir });
        log("✅ Frontend dependencies installed", colors.green);

        // 3. Install Server Dependencies
        const serverDir = path.join(rootDir, 'server');
        log("\n📦 Installing server dependencies...", colors.yellow);
        execSync('npm install', { stdio: 'inherit', cwd: serverDir });
        log("✅ Server dependencies installed", colors.green);

        // 4. Setup Environment Variables
        log("\n⚙️ Setting up environment variables...", colors.yellow);
        const envPath = path.join(serverDir, '.env');
        const envExamplePath = path.join(serverDir, '.env.example');

        if (!fs.existsSync(envPath)) {
            if (fs.existsSync(envExamplePath)) {
                fs.copyFileSync(envExamplePath, envPath);
                log("✅ Created .env from .env.example", colors.green);
            } else {
                log("⚠️ .env.example not found. Please create .env manually.", colors.yellow);
            }
        } else {
            log("ℹ️ .env already exists, skipping copy.", colors.blue);
        }

        // 5. Success Message
        log("\n✨ Setup Complete!", colors.bright + colors.green);
        log("----------------------------------------", colors.green);
        log("Next steps:", colors.bright);
        log("1. Start XAMPP (Apache & MySQL)", colors.white);
        log("2. Create a database named 'thikana_db' in phpMyAdmin", colors.white);
        log("3. Run: cd server && npm run migrate", colors.white);
        log("4. Run: npm run dev (in root) and npm run dev (in server)", colors.white);
        log("----------------------------------------", colors.green);

    } catch (error) {
        log(`\n❌ Setup failed: ${error.message}`, colors.red);
        process.exit(1);
    }
}

setup();
