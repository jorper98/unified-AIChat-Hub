import { MongoClient } from 'mongodb';
import * as bcrypt from 'bcryptjs';

// This script creates or resets the default Admin user, bypassing email verification.
// Run with: npx tsx scripts/reset-admin.ts

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chathub';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@localhost';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';

async function resetAdmin() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected successfully.');
    
    const db = client.db('chathub');
    const usersCollection = db.collection('users');

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    // Upsert the admin user to ensure it exists and has the correct password
    const result = await usersCollection.updateOne(
      { email: ADMIN_EMAIL.toLowerCase() },
      {
        $set: {
          name: ADMIN_NAME,
          passwordHash,
          role: 'admin',
          isEmailVerified: true,
          emailVerificationToken: null,
          updatedAt: new Date()
        },
        $setOnInsert: {
          email: ADMIN_EMAIL.toLowerCase(),
          openRouterApiKey: null,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    if (result.matchedCount > 0) {
      console.log('✅ Admin user password has been reset.');
    } else {
      console.log('✅ New Admin user created.');
    }
    
    console.log('\nYou can now log in with:');
    console.log(`Email:    ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}\n`);
    
  } catch (error) {
    console.error('❌ Failed:', error);
  } finally {
    await client.close();
  }
}

resetAdmin();
