import { getFirestore } from '../config/firebase.js';
import crypto from 'crypto';

const db = getFirestore();

/**
 * Hash password using SHA-256
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Migrate old account passwords to use new hashing
 */
async function migrateOldAccounts() {
  const accountsToMigrate = [
    { email: 'chloe@gmail.com', password: 'chloe123' },
    { email: 'admin@craftly.com', password: 'jeremy' },
    { email: 'jeremy@gmail.com', password: 'jeremy123' },
  ];

  console.log('🔄 Starting password migration...\n');

  for (const account of accountsToMigrate) {
    try {
      // Find user by email
      const snapshot = await db.collection('users')
        .where('email', '==', account.email.toLowerCase())
        .get();

      if (snapshot.empty) {
        console.log(`❌ Account not found: ${account.email}`);
        continue;
      }

      const userDoc = snapshot.docs[0];
      const userId = userDoc.id;
      const passwordHash = hashPassword(account.password);

      // Update password hash
      await db.collection('users').doc(userId).update({
        passwordHash: passwordHash,
        migratedAt: new Date().toISOString(),
      });

      console.log(`✅ Updated: ${account.email} (${userId})`);
    } catch (error) {
      console.error(`❌ Error updating ${account.email}:`, error.message);
    }
  }

  console.log('\n✨ Migration complete!');
  process.exit(0);
}

// Run migration
migrateOldAccounts().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
