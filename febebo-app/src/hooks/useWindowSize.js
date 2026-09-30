import { useState, useEffect } from 'react';

/**
 * useWindowSize - Returns current window dimensions and size category flags.
 * Use this in components that need to adjust layout dynamically in JS (not just CSS).
 *
 * @returns {{ width: number, height: number, isSmall: boolean, isLarge: boolean, isTall: boolean }}
 *   isSmall  - screen width <= 360px (very small phones like iPhone SE 1st gen)
 *   isLarge  - screen width >= 430px (large phones like iPhone Pro Max, Galaxy S Ultra)
 *   isTall   - aspect ratio is tall (height > 2 * width), e.g. long narrow phones
 */
export function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    let rafId;
    const handler = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight });
      });
    };
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return {
    width: size.width,
    height: size.height,
    isSmall: size.width <= 360,
    isLarge: size.width >= 430,
    isTall: size.height > size.width * 2,
  };
}
