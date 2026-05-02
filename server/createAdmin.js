import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js'; 

const createSuperAdmin = async () => {
  try {
    console.log('1. Starting Connection...');
    
    // DIRECT CONNECTION STRING (No process.env here)
    const mongoURI = "mongodb+srv://awakeningjuniorgroup_db_user:2NkBb67AOJLdvbFS@kuakumarket.0qyzfx1.mongodb.net/?appName=kuakumarket";
    
    await mongoose.connect(mongoURI);
    console.log('2. ✅ MongoDB Connected Successfully!');

    // Check if Super Admin exists
    const existingAdmin = await User.findOne({ email: 'owner@kuakumarket.com' });
    if (existingAdmin) {
      console.log('⚠️ Super Admin already exists in database.');
      process.exit();
    }

    // Create Super Admin
    console.log('3. Creating User...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('@pa12!&Ter', salt); 

    const superAdmin = new User({
      name: 'Awakening',
      email: 'awakeningjuniorgroup@gmail.com',
      password: hashedPassword,
      role: 'superadmin',
      isVerified: true
    });

    await superAdmin.save();
    console.log('🎉 Super Admin Created Successfully!');
    process.exit();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createSuperAdmin();