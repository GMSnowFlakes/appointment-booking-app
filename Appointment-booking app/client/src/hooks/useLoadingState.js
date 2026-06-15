import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * useLoadingState — standardizes the common loading → error → data pattern.
 *
 * Basic fetch example:
 *   const { loading, error, data, execute } = useLoadingState([]);
 *
 *   useEffect(() => {
 *     execute(async () => {
 *       const res = await fetch('/api/services');
 *       if (!res.ok) {
 *         const body = await res.json();
 *         throw new Error(body.error || 'Request failed');
 *       }
 *       return (await res.json()).services;
 *     });
 *   }, []);
 *
 * The execute() wrapper:
 *   - Sets loading = true
 *   - Clears the previous error
 *   - Runs the async function
 *   - On success: updates `data`, leaves `error` cleared
 *   - On error:   clears `data`, sets `error`
 *   - Always sets loading = false in a finally block
 *
 * @param {*} initialState — the initial value for `data`
 * @returns {{ loading: boolean, error: string, data: *, setData: Function, execute: Function, reset: Function }}
 */
export default function useLoadingState(initialState = null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(initialState);
  // Track mounted state to avoid setting state on unmounted components
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /**
   * Wraps an async function with standard loading/error state management.
   * Returns the resolved value on success, or null on failure.
   *
   * @param {() => Promise<*>} fn — the async work to execute
   * @returns {Promise<*|null>} the resolved value, or null if an error occurred
   */
  const execute = useCallback(async (fn) => {
    setLoading(true);
    setError('');
    try {
      const result = await fn();
      if (mountedRef.current) {
        setData(result);
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || 'An unexpected error occurred');
      }
      return null;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Resets all state back to the initial values.
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError('');
    setData(initialState);
  }, [initialState]);

  return { loading, error, data, setData, execute, reset };
}
