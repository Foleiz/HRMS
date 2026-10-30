'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to manage smooth mounting and unmounting transitions (open/close animations)
 * @param isOpen Whether the menu/dropdown/modal should be open
 * @param duration Transition duration in milliseconds (default: 150ms)
 * @returns { shouldRender, isActive }
 *   - shouldRender: whether the component should be present in the DOM
 *   - isActive: whether the active (open) animation classes should be applied
 */
export function useAnimatedMount(isOpen: boolean, duration: number = 150) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isActive, setIsActive] = useState(isOpen);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (isOpen) {
      setShouldRender(true);
      // Ensure element is in DOM before triggering active CSS transition
      const frameId = requestAnimationFrame(() => {
        setIsActive(true);
      });
      return () => cancelAnimationFrame(frameId);
    } else {
      setIsActive(false);
      timeoutId = setTimeout(() => {
        setShouldRender(false);
      }, duration);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, duration]);

  return { shouldRender, isActive };
}
