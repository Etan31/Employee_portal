import { useState } from 'react';

export function useTabs(initialKey) {
  const [active, setActive] = useState(initialKey);
  return { active, setActive };
}
