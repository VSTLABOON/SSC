import { useEffect } from 'react';

let activeLocksCount = 0;

export function useLockBodyScroll(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    activeLocksCount++;
    if (activeLocksCount === 1) {
      document.body.classList.add('no-scroll');
      document.documentElement.classList.add('no-scroll');
    }

    return () => {
      activeLocksCount = Math.max(0, activeLocksCount - 1);
      if (activeLocksCount === 0) {
        document.body.classList.remove('no-scroll');
        document.documentElement.classList.remove('no-scroll');
        document.body.style.overflow = '';
      }
    };

  }, [isLocked]);
}
