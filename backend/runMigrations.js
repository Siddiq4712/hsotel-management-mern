import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const migrationsPath = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.js')).sort();

  console.log(`\n📦 Running ${files.length} migration(s)...\n`);

  for (const file of files) {
    try {
      const migration = await import(`./migrations/${file}`);
      console.log(`Running: ${file}`);
      if (migration.up) {
        await migration.up();
      }
    } catch (error) {
      console.error(`✗ Failed to run ${file}:`, error.message);
    }
  }

  console.log('\n✓ Migrations completed!\n');
}

runMigrations().catch(error => {
  console.error('Migration runner error:', error);
  process.exit(1);
});
