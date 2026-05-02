import mongoose from 'mongoose';
import User from './models/User.js'; 

const createSuperAdmin = async () => {
  try {
    // 1. Connect
    const mongoURI = "mongodb+srv://awakeningjuniorgroup_db_user:2NkBb67AOJLdvbFS@kuakumarket.0qyzfx1.mongodb.net/?appName=kuakumarket";
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected');

    // 2. Create User with PLAIN TEXT password
    // Your User model will automatically hash this!
    const superAdmin = new User({
      name: 'Parth Shah',
      email: 'awakeningjuniorgroup@gmail.com',
      password: '@pa12!&Ter', // <--- sending plain text now
      role: 'superadmin',
      isVerified: true
    });

    await superAdmin.save();
    console.log('🎉 Super Admin Created!');
  
    
    process.exit();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createSuperAdmin();