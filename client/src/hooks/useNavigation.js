import { useState, useEffect } from 'react';

export function useNavigation() {
  const [active, setActive] = useState(() => {
    const hash = window.location.hash || '#/dashboard';
    return hash.replace('#/', '');
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/dashboard';
      setActive(hash.replace('#/', ''));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (route) => {
    window.location.hash = route;
  };

  return { active, navigate };
}
