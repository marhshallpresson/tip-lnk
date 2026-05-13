/**
 * Dynamic Auth Event Bridge
 *
 * The DynamicContextProvider `settings.events` callbacks run OUTSIDE React's
 * component tree and cannot directly call context functions or setState.
 * This tiny pub/sub bus lets main.jsx fire events that AuthContext can subscribe
 * to from inside the tree, eliminating the timing / closure-staleness problems
 * that come with useEffect dependency arrays.
 */

const _listeners = new Map();

const emit = (event, data) => {
  (_listeners.get(event) || []).forEach((fn) => {
    try { fn(data); } catch (e) { console.error('[authEvents] listener error:', e); }
  });
};

const on = (event, fn) => {
  if (!_listeners.has(event)) _listeners.set(event, []);
  _listeners.get(event).push(fn);
  return () => {
    const arr = _listeners.get(event) || [];
    _listeners.set(event, arr.filter((f) => f !== fn));
  };
};

export const authEvents = { emit, on };
