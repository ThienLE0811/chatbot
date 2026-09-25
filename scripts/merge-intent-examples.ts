/**
 * One-off migration: intent examples used to be stored twice, in `intents`
 * (what the intents page edited) and in `nlu` (what Rasa trains on), and
 * examples typed on the intents page were never trained. The intents page now
 * edits `nlu` directly, so this moves every example found only in `intents`
 * over to `nlu`, then drops the old `intents.examples` field.
 *
 *   npm run migrate:intent-examples               # apply
 *   npm run migrate:intent-examples -- --dry-run  # only print what would change
 *
 * An example that already belongs to another intent is not moved (the model
 * could not tell the two apart); it is listed so it can be fixed by hand.
 * Running it again is harmless.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import {
  exampleKey,
  findConflicts,
  mergeExamples,
} from '../src/bot/intents/intent-examples';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const verb = dryRun ? 'sẽ' : 'đã';
  const db = mongoose.connection.db;
  const intents = db.collection('intents');
  const nlu = db.collection('nlu');

  const withExamples = await intents
    .find({ examples: { $exists: true } })
    .toArray();
  const nluDocs = await nlu.find().toArray();

  let moved = 0;
  for (const intent of withExamples) {
    const own = nluDocs.find((doc) => doc.intent === intent.title);
    const trained = new Set((own?.examples ?? []).map(exampleKey));
    const missing = mergeExamples([], intent.examples ?? []).filter(
      (example) => !trained.has(exampleKey(example)),
    );
    if (missing.length === 0) continue;

    const others = nluDocs.filter((doc) => doc.intent !== intent.title);
    const conflicts = findConflicts(missing, others as any[]);
    const conflicting = new Set(conflicts.map((c) => exampleKey(c.example)));
    const toMove = missing.filter((e) => !conflicting.has(exampleKey(e)));

    for (const { example, intent: owner } of conflicts) {
      console.warn(
        `⚠ ${intent.title}: bỏ qua "${example}" vì đang là câu mẫu của "${owner}"`,
      );
    }
    if (toMove.length === 0) continue;

    console.log(
      `${intent.title}: ${verb} thêm ${toMove.length} câu mẫu chưa được train: ` +
        toMove.map((e) => `"${e}"`).join(', '),
    );
    moved += toMove.length;
    if (!dryRun) {
      const now = new Date();
      await nlu.updateOne(
        { intent: intent.title },
        {
          $push: { examples: { $each: toMove } },
          $set: { updateAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );
    }
  }

  if (!dryRun && withExamples.length > 0) {
    await intents.updateMany(
      { examples: { $exists: true } },
      { $unset: { examples: '' } },
    );
  }
  console.log(
    `Xong: ${verb} chuyển ${moved} câu mẫu sang nlu, ` +
      `${verb} xóa trường examples cũ ở ${withExamples.length} ý định.`,
  );
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(main)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
