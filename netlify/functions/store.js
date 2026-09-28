// Shared key-value store backing the Ledger app's data, using Netlify Blobs.
// Replaces per-browser localStorage so every device reads and writes the
// same live data instead of its own separate copy.
const { getStore } = require('@netlify/blobs');

function json(obj, statusCode) {
  return {
    statusCode: statusCode || 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(obj)
  };
}

exports.handler = async (event) => {
  try {
    const store = getStore({ name: 'ledger', consistency: 'strong' });
    const params = event.queryStringParameters || {};

    if (event.httpMethod === 'GET' && params.list === '1') {
      const prefix = params.prefix || '';
      const { blobs } = await store.list({ prefix });
      const keys = blobs.map(b => b.key.slice(prefix.length));
      return json({ keys, prefix, shared: true });
    }

    if (event.httpMethod === 'GET') {
      const key = params.key;
      if (!key) return json({ error: 'missing key' }, 400);
      const value = await store.get(key, { type: 'text' });
      return json({ key, value: value === null ? null : value, shared: true });
    }

    if (event.httpMethod === 'PUT') {
      const key = params.key;
      if (!key) return json({ error: 'missing key' }, 400);
      await store.set(key, event.body || '');
      return json({ key, value: event.body || '', shared: true });
    }

    if (event.httpMethod === 'DELETE') {
      const key = params.key;
      if (!key) return json({ error: 'missing key' }, 400);
      await store.delete(key);
      return json({ key, deleted: true, shared: true });
    }

    return json({ error: 'method not allowed' }, 405);
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
};
