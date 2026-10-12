const pendingForms = new WeakMap();
const pendingInputs = new WeakMap();

// Reuse the same IDs after an uncertain response; a reset or changed input starts
// a new operation. No financial payload is persisted in browser storage.
export function formOperation(form, input) {
  const fingerprint = JSON.stringify(input);
  const previous = pendingForms.get(form);
  if (previous?.fingerprint === fingerprint) return previous.operation;
  const operation = {};
  pendingForms.set(form, {fingerprint, operation});
  return operation;
}

export function clearFormOperation(form) { pendingForms.delete(form); }

export function operationIds(input, count = 1) {
  const operation = input.operation || input;
  let ids = pendingInputs.get(operation);
  if (!ids || ids.length !== count) {
    ids = Array.from({length:count}, () => crypto.randomUUID());
    pendingInputs.set(operation, ids);
  }
  return ids;
}

export async function insertOnce(supabase, table, rows, userId, key = 'client_request_id') {
  const items = Array.isArray(rows) ? rows : [rows];
  const result = await supabase.from(table).insert(rows).select('*');
  if (!result.error) return result.data || [];
  // A timeout may follow a committed INSERT; a duplicate may follow a retry.
  const ids = items.map(row => row[key]);
  const existing = await supabase.from(table).select('*').eq('user_id', userId).in(key, ids);
  if (!existing.error && existing.data?.length === items.length) {
    const byId = new Map(existing.data.map(row => [row[key], row]));
    if (ids.every(id => byId.has(id))) return ids.map(id => byId.get(id));
  }
  throw result.error;
}
