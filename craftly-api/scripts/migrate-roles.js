import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';

// Initialize Firebase (use same config as main app)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Migration Script: Convert users.role (string) to users.roles (array)
 *
 * Before:
 *   users.role = "buyer" | "seller" | "admin"
 *
 * After:
 *   users.roles = ["buyer"] | ["seller"] | ["admin"] | ["buyer", "seller"]
 *
 * This script is idempotent - safe to run multiple times
 */

async function migrateRoles() {
  console.log('\n🔄 Starting Firestore Role Migration...\n');

  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    if (snapshot.empty) {
      console.log('⚠️  No users found in Firestore');
      return;
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    // Process users in batches
    const batch = writeBatch(db);
    const batchSize = 500;
    let batchCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const userData = docSnapshot.data();
      const userId = docSnapshot.id;

      try {
        // Check if already migrated (has roles array)
        if (userData.roles && Array.isArray(userData.roles)) {
          console.log(`✓ [SKIPPED] User ${userId}: Already has roles array`);
          skipped++;
          continue;
        }

        // Check if has old role field
        if (!userData.role) {
          console.log(`⚠️  [WARNING] User ${userId}: No role or roles field found, skipping`);
          skipped++;
          continue;
        }

        // Convert role string to roles array
        const newRoles = [userData.role];
        const userRef = doc(db, 'users', userId);

        batch.update(userRef, {
          roles: newRoles,
          // Keep role field for backward compatibility (readonly)
          // role: userData.role  (already exists, don't update)
          updatedAt: new Date().toISOString(),
        });

        console.log(`✓ [MIGRATED] User ${userId}: role="${userData.role}" → roles=[${newRoles}]`);
        migrated++;
        batchCount++;

        // Commit batch every 500 operations
        if (batchCount >= batchSize) {
          await batch.commit();
          console.log(`  💾 Batch committed (${migrated} users migrated so far)`);
          batchCount = 0;
        }
      } catch (error) {
        console.error(`❌ [ERROR] User ${userId}: ${error.message}`);
        errors++;
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`  💾 Final batch committed`);
    }

    console.log('\n✅ Migration Complete!');
    console.log(`   Migrated: ${migrated} users`);
    console.log(`   Skipped:  ${skipped} users`);
    console.log(`   Errors:   ${errors} users\n`);

    if (errors === 0) {
      console.log('🎉 All users successfully migrated to roles array!\n');
    } else {
      console.log(`⚠️  ${errors} users failed migration. Please review and retry.\n`);
    }

    process.exit(errors > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateRoles();
