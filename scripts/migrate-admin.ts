import { MongoClient, ObjectId } from 'mongodb';
import * as bcrypt from 'bcryptjs';

// This script migrates existing global data to a new or existing Admin user.
// Run with: npx tsx scripts/migrate-admin.ts

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chathub';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@localhost';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';

async function migrate() {
  console.log('Starting data migration...');
  console.log('Connecting to MongoDB...');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected successfully.');
    
    const db = client.db('chathub');
    const usersCollection = db.collection('users');
    const threadsCollection = db.collection('threads');
    const messagesCollection = db.collection('messages');
    const settingsCollection = db.collection('settings');
    const promptsCollection = db.collection('prompts');

    // 1. Find or create Admin user
    let adminUser = await usersCollection.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    let adminId: ObjectId;

    if (!adminUser) {
      console.log('Admin user not found. Creating...');
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      const result = await usersCollection.insertOne({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        role: 'admin',
        isEmailVerified: true,
        emailVerificationToken: null,
        openRouterApiKey: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      adminId = result.insertedId as ObjectId;
      console.log(`Admin user created with ID: ${adminId}`);
    } else {
      adminId = adminUser._id as ObjectId;
      console.log(`Existing Admin user found with ID: ${adminId}`);
    }

    // 2. Migrate threads without userId
    const threadsResult = await threadsCollection.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: adminId } }
    );
    console.log(`Migrated ${threadsResult.modifiedCount} threads to Admin user.`);

    // 3. Migrate messages without userId
    const messagesResult = await messagesCollection.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: adminId } }
    );
    console.log(`Migrated ${messagesResult.modifiedCount} messages to Admin user.`);

    // 4. Migrate settings (global_settings) to admin user settings
    const globalSettings = await settingsCollection.findOne({ _id: 'global_settings' as any });
    if (globalSettings) {
      await settingsCollection.updateOne(
        { userId: adminId },
        { 
          $set: { 
            ...globalSettings, 
            userId: adminId,
            _id: undefined // remove old _id so upsert works if needed, but $set will just update
          } 
        },
        { upsert: true }
      );
      console.log('Migrated global settings to Admin user settings.');
    } else {
      console.log('No global settings found to migrate.');
    }

    // 5. Migrate prompts without userId
    const promptsResult = await promptsCollection.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: adminId } }
    );
    console.log(`Migrated ${promptsResult.modifiedCount} prompts to Admin user.`);

    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Database connection closed.');
  }
}

migrate();
