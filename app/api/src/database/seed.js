require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();

  const email = process.env.ADMIN_EMAIL || 'admin@cocoma.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const name = 'Admin';

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    process.exit(0);
  }

  await User.create({ name, email, password, role: 'admin', email_verified_at: new Date() });
  console.log(`✅ Admin user created: ${email}`);
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
