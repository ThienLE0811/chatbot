import { NotFoundException } from '@nestjs/common';
import { isValidObjectId, Model } from 'mongoose';

/**
 * Shared lookups of the dialogue collections edited as plain records
 * (entities, slots, responses, stories, rules, actions, forms).
 */

/**
 * `?filters=<name>` lists the records with that name. Only a plain string
 * filters: `?filters[$ne]=x` arrives as an object and must not reach Mongo.
 */
export function byName(field: string, value: unknown): Record<string, string> {
  return typeof value === 'string' && value ? { [field]: value } : {};
}

/** A malformed id is just another record that does not exist. */
export async function findRecord<T>(
  model: Model<T>,
  id: string,
  notFound: string,
) {
  const record = isValidObjectId(id) ? await model.findById(id).exec() : null;
  if (!record) throw new NotFoundException(notFound);
  return record;
}

/** Sets only the given fields; the body never reaches Mongo as an update document. */
export async function updateRecord<T>(
  model: Model<T>,
  id: string,
  changes: Record<string, unknown>,
  notFound: string,
) {
  const record = isValidObjectId(id)
    ? await model
        .findByIdAndUpdate(
          id,
          { $set: changes },
          { new: true, runValidators: true },
        )
        .exec()
    : null;
  if (!record) throw new NotFoundException(notFound);
  return record;
}

export async function deleteRecord<T>(
  model: Model<T>,
  id: string,
  notFound: string,
) {
  const record = isValidObjectId(id)
    ? await model.findByIdAndDelete(id).exec()
    : null;
  if (!record) throw new NotFoundException(notFound);
  return record;
}
