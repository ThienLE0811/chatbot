/**
 * Inserts the sample training data into MongoDB so an empty bot can be
 * trained. Documents that already exist (same name) are left untouched, so
 * running it again never overwrites what was edited in the admin UI.
 *
 *   npm run seed:training               # insert missing documents
 *   npm run seed:training -- --reset    # also replace documents with a
 *                                       # sample name by the latest sample
 *   npm run seed:training -- --dry-run  # only print what would change
 *
 * --reset discards UI edits made to sample documents; documents with other
 * names are never touched.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import {
  TRAINING_COLLECTIONS,
  TrainingCollection,
  toTrainingDataset,
} from '../src/training/data/training-data.exporter';
import {
  SEED_KEYS,
  TRAINING_SEED,
} from '../src/training/data/training-data.seed';
import { TrainingDataValidator } from '../src/training/data/training-data.validator';

interface SeedOptions {
  dryRun: boolean;
  reset: boolean;
}

async function seedCollection(
  name: TrainingCollection,
  { dryRun, reset }: SeedOptions,
) {
  const key = SEED_KEYS[name];
  const collection = mongoose.connection.collection(name);
  const docs = TRAINING_SEED[name];
  const sampleFilter = { [key]: { $in: docs.map((doc) => doc[key]) } };
  const existing = new Set(
    (await collection.distinct(key, sampleFilter)) as string[],
  );
  const toInsert = reset ? docs : docs.filter((doc) => !existing.has(doc[key]));

  if (!dryRun) {
    if (reset && existing.size > 0) {
      await collection.deleteMany(sampleFilter);
    }
    if (toInsert.length > 0) {
      const now = new Date();
      await collection.insertMany(
        toInsert.map((doc) => ({ ...doc, createdAt: now })),
      );
    }
  }

  const verb = dryRun ? 'sẽ' : 'đã';
  const replaced = reset ? existing.size : 0;
  const kept = reset
    ? `${verb} thay ${replaced}`
    : `bỏ qua ${existing.size} (đã có)`;
  console.log(
    `${name.padEnd(10)} ${verb} thêm ${toInsert.length - replaced}, ${kept}`,
  );
}

async function main() {
  const options: SeedOptions = {
    dryRun: process.argv.includes('--dry-run'),
    reset: process.argv.includes('--reset'),
  };

  const report = new TrainingDataValidator().validate(
    toTrainingDataset(TRAINING_SEED),
  );
  if (!report.valid) {
    for (const issue of report.errors) {
      console.error(`✗ ${issue.path}: ${issue.message}`);
    }
    throw new Error('Dữ liệu mẫu không hợp lệ, dừng seed');
  }

  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');
  await mongoose.connect(uri);

  try {
    for (const name of TRAINING_COLLECTIONS) {
      await seedCollection(name, options);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
