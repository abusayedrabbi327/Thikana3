/**
 * seed.js - Unified Seeding Script for Thikana Marketplace (PostgreSQL / Supabase)
 * 
 * Usage:
 *   node seed.js --fresh       (Wipes everything, creates demo users + 100 premium products)
 *   node seed.js --realistic   (Keeps users, wipes products, generates 100 randomized products)
 */
require('dotenv').config({ path: '../.env' });
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// ─── CONFIGURATION & DATA ──────────────────────────────────────────────

const LOCATION_COORDS = {
  'Gulshan 1, Dhaka': [23.7770, 90.4130],
  'Gulshan 2, Dhaka': [23.7925, 90.4162],
  'Banani, Dhaka': [23.7940, 90.4043],
  'Dhanmondi, Dhaka': [23.7461, 90.3742],
  'Bashundhara R/A, Dhaka': [23.8193, 90.4526],
  'Uttara Sector 4, Dhaka': [23.8687, 90.3953],
  'Uttara Sector 11, Dhaka': [23.8824, 90.3888],
  'Mirpur DOHS, Dhaka': [23.8340, 90.3640],
  'Mohakhali DOHS, Dhaka': [23.7794, 90.4014],
  'Baridhara Diplomatic Zone, Dhaka': [23.7999, 90.4222],
  'Badda, Dhaka': [23.7758, 90.4285],
  'Aftabnagar, Dhaka': [23.7667, 90.4430],
  'Khilgaon, Dhaka': [23.7500, 90.4333],
  'Mohammadpur, Dhaka': [23.7542, 90.3631]
};

const LOCATIONS = Object.keys(LOCATION_COORDS);

const USER_DATA = [
  { name: 'Asif Mustoba Sazzad', email: 'sazzad@gmail.com', role: 'buyer', bio: 'Tech enthusiast looking for a modern residence.' },
  { name: 'Arefin Iqram', email: 'iqram@gmail.com', role: 'seller', bio: 'Specialist in premium teak furniture.' },
  { name: 'Nadia Sultana Mim', email: 'mim@gmail.com', role: 'seller', bio: 'Real estate consultant for Gulshan luxury apartments.' },
  { name: 'Maine Uddin Shanto', email: 'shanto@gmail.com', role: 'seller', bio: 'Curator of minimalist furniture.' },
  { name: 'Nabiul Islam Nabil', email: 'nabil@gmail.com', role: 'seller', bio: 'Trusted source for high-end electronics.' },
  { name: 'Adiba Tahsin', email: 'tahsin@gmail.com', role: 'seller', bio: 'Architect and furniture curator.' },
  { name: 'Sara Sadia Noor', email: 'noor@gmail.com', role: 'buyer', bio: 'Searching for an elegant secure 3BHK.' },
  { name: 'Mahmuda Haque Mohona', email: 'mohona@gmail.com', role: 'seller', bio: 'Senior agent for exclusive penthouses.' },
  { name: 'Mezabur Rahaman Rasel', email: 'rasel@gmail.com', role: 'seller', bio: 'Premium home appliance expert.' },
  { name: 'Mirajul Abedin Saimun', email: 'saimun@gmail.com', role: 'seller', bio: 'Durable home and office furniture seller.' },
  { name: 'Nigar Sultana', email: 'sultana@gmail.com', role: 'seller', bio: 'Dream home specialist since 2020.' },
  { name: 'Mahira Mehek Riya', email: 'riya@gmail.com', role: 'seller', bio: 'Interior design and functional spaces expert.' },
  { name: 'Cristiano Ronaldo', email: 'ronaldo@gmail.com', role: 'seller', bio: 'Exclusive agent for world-class residential assets.' },
  { name: 'Lionel Messi', email: 'messi@gmail.com', role: 'seller', bio: 'Committed to premium family-friendly apartments.' }
];

const ADJECTIVES = ['Luxury', 'Modern', 'Premium', 'Cozy', 'Spacious', 'Elegant', 'Minimalist', 'Classic', 'Exclusive', 'Beautiful'];
const PROPERTY_TYPES = ['3BHK Flat', '4BHK Apartment', 'Studio Apartment', 'Duplex House', 'Penthouse', '2BHK Flat'];
const CATEGORIES = ['house_sell', 'house_rent', 'furniture', 'appliance'];

// ─── UTILS ─────────────────────────────────────────────────────────────

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandRoundedInt = (min, max, roundTo) => Math.round((Math.floor(Math.random() * (max - min + 1)) + min) / roundTo) * roundTo;
const buildUrl = (category, i) => `https://picsum.photos/seed/${category}-${i}/1200/800`;
const buildPhone = (i) => `+88017${String(10000000 + i).slice(-8)}`;
const buildAddress = () => getRandom(LOCATIONS);

// ─── GENERATORS ────────────────────────────────────────────────────────

function generateProductData(category, index) {
  const loc = getRandom(LOCATIONS);
  const adj = getRandom(ADJECTIVES);
  const brand = getRandom(['Hatil', 'Otobi', 'IKEA', 'Navana', 'Samsung', 'LG', 'Sony', 'Dyson', 'Panasonic']);
  let title, description, price, attributes;
  if (category === 'house_sell') {
    title = `${adj} ${getRandom(PROPERTY_TYPES)} for Sale in ${loc.split(',')[0]}`;
    description = `An architectural masterpiece! This ${adj.toLowerCase()} home offers elite finishes, expansive living spaces, and top-tier security. Perfect for families looking for a permanent, luxurious address.`;
    price = getRandRoundedInt(8500000, 75000000, 100000);
    attributes = { beds: getRandInt(3, 6), baths: getRandInt(2, 5), size_sqft: getRandInt(1500, 5000) };
  } else if (category === 'house_rent') {
    title = `${adj} ${getRandom(PROPERTY_TYPES)} available for Rent in ${loc.split(',')[0]}`;
    description = `Sophisticated urban living with panoramic views. Fully furnished with high-end designer pieces. Ideal for international standard living in a secure neighborhood.`;
    price = getRandRoundedInt(30000, 350000, 1000);
    attributes = { beds: getRandInt(1, 4), baths: getRandInt(1, 4), size_sqft: getRandInt(800, 3000), available_for: getRandom(['Family', 'Bachelor', 'Any']), available_from: new Date(Date.now() + getRandInt(1, 30) * 86400000).toISOString().split('T')[0] };
  } else if (category === 'furniture') {
    title = `${adj} ${brand} Furniture Piece`;
    description = `Hand-crafted ${brand} edition furniture. Sustainable teak wood and premium upholstery. Barely used and fits perfectly with any modern interior.`;
    price = getRandRoundedInt(5000, 150000, 500);
    attributes = { material: 'Solid Wood', condition: getRandom(['Brand New', 'Like New', 'Good']), brand };
  } else {
    title = `${adj} ${brand} Smart Home Appliance`;
    description = `Future-proof your home with AI-integrated high-efficiency tech from ${brand}. Includes full official warranty and energy-saving certification. Working perfectly.`;
    price = getRandRoundedInt(8000, 450000, 500);
    attributes = { condition: 'Factory New', warranty: 'Official Support', brand };
  }
  return { title, description, price, location: loc, lat: LOCATION_COORDS[loc][0], lng: LOCATION_COORDS[loc][1], attributes };
}

// ─── MAIN SEED FUNCTION ────────────────────────────────────────────────

async function seed() {
  const isFresh = process.argv.includes('--fresh');
  const isRealistic = process.argv.includes('--realistic');
  if (!isFresh && !isRealistic) { console.log('Please specify mode: --fresh or --realistic'); process.exit(1); }
  console.log(`🚀 Starting ${isFresh ? 'FRESH' : 'REALISTIC'} seeding process...`);

  try {
    const userPass = await bcrypt.hash('12345678', 10);
    const adminPass = await bcrypt.hash('22323678', 10);

    if (isFresh) {
      console.log('🗑️  Wiping all existing data (Users, Products, etc.)...');
      await pool.query('TRUNCATE refresh_tokens, product_images, reviews, order_items, orders, cart_items, favourites, inquiries, messages, notifications, identity_verifications, blocked_nids, nid_submissions, products, users RESTART IDENTITY CASCADE');

      console.log('👑 Seeding Admin (Spoidormon)...');
      await pool.query(
        `INSERT INTO users (full_name, email, password, role, is_admin, avatar_url, phone, address, is_verified, nid_verified) VALUES ($1, $2, $3, 'admin', true, $4, $5, $6, true, true)`,
        ['Spoidormon', 'admin@thikana.com', adminPass, 'https://i.pravatar.cc/300?u=admin', '+8801700000000', 'Admin HQ, Dhaka']
      );

      console.log('👥 Seeding Demo Users...');
      for (const [i, u] of USER_DATA.entries()) {
        await pool.query(
          `INSERT INTO users (full_name, email, password, role, avatar_url, bio, phone, address, is_verified, nid_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true)`,
          [u.name, u.email, userPass, u.role, `https://i.pravatar.cc/300?u=${u.email}`, u.bio, buildPhone(i + 1), buildAddress()]
        );
      }
    } else {
      console.log('📦 Wiping existing products only...');
      await pool.query('TRUNCATE product_images, products RESTART IDENTITY CASCADE');
    }

    const { rows: sellers } = await pool.query("SELECT id FROM users WHERE role = 'seller'");
    if (sellers.length === 0) throw new Error('No sellers found in database. Run with --fresh first.');

    console.log('📦 Generating 100 Premium Products...');
    for (let i = 1; i <= 100; i++) {
      const sellerId = getRandom(sellers).id;
      const category = getRandom(CATEGORIES);
      const data = generateProductData(category, i);
      const { rows: pResult } = await pool.query(
        `INSERT INTO products (seller_id, category, title, description, price, location, lat, lng, status, attributes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', $9) RETURNING id`,
        [sellerId, category, data.title, data.description, data.price, data.location, data.lat, data.lng, JSON.stringify(data.attributes)]
      );
      const productId = pResult[0].id;
      await pool.query('INSERT INTO product_images (product_id, image_url, is_primary) VALUES ($1, $2, true)', [productId, buildUrl(category, i)]);
      if (Math.random() > 0.5) {
        await pool.query('INSERT INTO product_images (product_id, image_url, is_primary) VALUES ($1, $2, false)', [productId, buildUrl('interior', i + 100)]);
      }
      if (i % 25 === 0) console.log(`   ✓ ${i} products inserted...`);
    }

    console.log(`\n🎉 SUCCESS: ${isFresh ? 'Fresh' : 'Realistic'} seeding complete!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
}

seed();
