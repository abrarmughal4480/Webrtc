import { useEffect, useState } from 'react';

const useIntersectionObserver = (targetId, options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    const target = document.getElementById(targetId);
    
    if (!target) {
      console.warn(`Element with id "${targetId}" not found`);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      setEntry(entry);
    }, {
      root: options.root || null,
      rootMargin: options.rootMargin || "0px",
      threshold: options.threshold || 0,
    });

    observer.observe(target);

    return () => {
      observer.unobserve(target);
      observer.disconnect();
    };
  }, [targetId, options.root, options.rootMargin, options.threshold]);

  return { isIntersecting, entry };
};

export default useIntersectionObserver;
