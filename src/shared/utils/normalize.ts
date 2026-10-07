/**
 * Utility to recursively normalize Mongoose documents / plain objects:
 * - Converts `_id` to string `id`
 * - Deletes `_id` and Mongoose version key `__v`
 * - Recursively processes nested objects and arrays
 */
export const normalizeDocument = <T = any>(obj: any): T => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle Mongoose documents by converting to JSON object first if method exists
  if (typeof obj.toJSON === 'function') {
    obj = obj.toJSON();
  }

  // Handle Date instances
  if (obj instanceof Date) {
    return obj as any;
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map(normalizeDocument) as any;
  }

  // Handle Primitive types
  if (typeof obj !== 'object') {
    return obj;
  }

  const normalized: Record<string, any> = {};

  // Convert _id to id if _id exists
  if (obj._id !== undefined) {
    normalized.id = typeof obj._id === 'object' && obj._id !== null ? obj._id.toString() : String(obj._id);
  } else if (obj.id !== undefined) {
    normalized.id = typeof obj.id === 'object' && obj.id !== null ? obj.id.toString() : String(obj.id);
  }

  for (const key of Object.keys(obj)) {
    if (key === '_id' || key === '__v') {
      continue;
    }
    normalized[key] = normalizeDocument(obj[key]);
  }

  return normalized as T;
};
