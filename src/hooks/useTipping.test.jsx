import { renderHook, act } from '@testing-library/react';
import { useTipping } from './useTipping';

describe('useTipping', () => {
  describe('calculateRoute', () => {
    it('calculates the correct route and USDC amount for a valid token and amount', () => {
      // Act
      const { result } = renderHook(() => useTipping('CreatorPubKey'));
      
      act(() => {
        result.current.calculateRoute('SOL', 10);
      });

      // Assert
      // token.price = 178.50. 10 * 178.50 = 1785.
      // fee = 1785 * 0.003 = 5.355.
      // net = 1785 - 5.355 = 1779.645.
      expect(result.current.route).not.toBeNull();
      expect(result.current.tipAmountUSDC).toBe(1779.645);
      expect(result.current.route.outputAmount).toBe(1779.645);
    });

    it('returns null route and 0 USDC for empty or zero token amount', () => {
      const { result } = renderHook(() => useTipping('CreatorPubKey'));
      
      act(() => {
        result.current.calculateRoute('SOL', 0);
      });

      expect(result.current.route).toBeNull();
      expect(result.current.tipAmountUSDC).toBe(0);
    });

    it('returns null route and 0 USDC for negative amounts', () => {
      const { result } = renderHook(() => useTipping('CreatorPubKey'));
      
      act(() => {
        result.current.calculateRoute('SOL', -50);
      });

      expect(result.current.route).toBeNull();
      expect(result.current.tipAmountUSDC).toBe(0);
    });

    it('returns null route and 0 USDC for undefined input', () => {
      const { result } = renderHook(() => useTipping('CreatorPubKey'));
      
      act(() => {
        result.current.calculateRoute('SOL', undefined);
      });

      expect(result.current.route).toBeNull();
      expect(result.current.tipAmountUSDC).toBe(0);
    });

    it('returns null route and 0 USDC for unknown token symbols', () => {
      const { result } = renderHook(() => useTipping('CreatorPubKey'));
      
      act(() => {
        result.current.calculateRoute('UNKNOWN', 10);
      });

      expect(result.current.route).toBeNull();
      expect(result.current.tipAmountUSDC).toBe(0);
    });

    it('calculates higher price impact for amounts > 1000', () => {
      const { result } = renderHook(() => useTipping('CreatorPubKey'));
      
      act(() => {
        result.current.calculateRoute('SOL', 1001);
      });

      expect(result.current.route.priceImpact).toBe(0.15);
    });

    it('calculates standard price impact for amounts <= 1000', () => {
      const { result } = renderHook(() => useTipping('CreatorPubKey'));
      
      act(() => {
        result.current.calculateRoute('SOL', 1000);
      });

      expect(result.current.route.priceImpact).toBe(0.05);
    });
  });

  describe('reset', () => {
    it('resets all state correctly', () => {
      const { result } = renderHook(() => useTipping('CreatorPubKey'));
      
      act(() => {
        result.current.setAmount('10');
        result.current.calculateRoute('SOL', 10);
      });

      expect(result.current.amount).toBe('10');
      expect(result.current.route).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.amount).toBe('');
      expect(result.current.route).toBeNull();
      expect(result.current.tipAmountUSDC).toBe(0);
      expect(result.current.txResult).toBeNull();
    });
  });
});
