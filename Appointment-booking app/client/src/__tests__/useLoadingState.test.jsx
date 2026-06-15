import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import useLoadingState from '../hooks/useLoadingState';

describe('useLoadingState', () => {
  it('starts with loading=false, error="", and the initial data', () => {
    const { result } = renderHook(() => useLoadingState([1, 2, 3]));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.data).toEqual([1, 2, 3]);
  });

  it('defaults initial data to null', () => {
    const { result } = renderHook(() => useLoadingState());
    expect(result.current.data).toBeNull();
  });

  it('sets loading=true during execute, then false after', async () => {
    const { result } = renderHook(() => useLoadingState());

    let resolvePromise;
    const promise = new Promise((resolve) => { resolvePromise = resolve; });

    let executePromise;
    act(() => {
      executePromise = result.current.execute(() => promise);
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise('done');
      await executePromise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('done');
    expect(result.current.error).toBe('');
  });

  it('sets error on rejection and preserves previous data', async () => {
    const { result } = renderHook(() => useLoadingState('initial'));

    await act(async () => {
      await result.current.execute(async () => {
        throw new Error('Something went wrong');
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Something went wrong');
    // Data is preserved on error (not cleared)
    expect(result.current.data).toBe('initial');
  });

  it('captures non-Error throws', async () => {
    const { result } = renderHook(() => useLoadingState());

    await act(async () => {
      await result.current.execute(async () => {
        throw 'string error';
      });
    });

    expect(result.current.error).toBe('An unexpected error occurred');
  });

  it('resets all state via reset()', async () => {
    const { result } = renderHook(() => useLoadingState('initial'));

    // Set some state
    await act(async () => {
      await result.current.execute(async () => { throw new Error('boom'); });
    });
    expect(result.current.error).toBe('boom');

    act(() => {
      result.current.reset();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.data).toBe('initial');
  });

  it('setData works for direct data mutation (optimistic updates)', () => {
    const { result } = renderHook(() => useLoadingState('initial'));

    act(() => {
      result.current.setData('optimistic');
    });

    expect(result.current.data).toBe('optimistic');
  });

  it('clears error at the start of a new execute', async () => {
    const { result } = renderHook(() => useLoadingState());

    await act(async () => {
      await result.current.execute(async () => { throw new Error('first error'); });
    });
    expect(result.current.error).toBe('first error');

    await act(async () => {
      await result.current.execute(async () => 'second success');
    });

    // Error should be cleared
    expect(result.current.error).toBe('');
    expect(result.current.data).toBe('second success');
  });
});
