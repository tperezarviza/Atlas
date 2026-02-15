import { useRef, useEffect, useState } from 'react';

interface TabPanelProps {
  tabKey: string;
  children: React.ReactNode;
}

export default function TabPanel({ tabKey, children }: TabPanelProps) {
  const [visible, setVisible] = useState(true);
  const prevKey = useRef(tabKey);

  useEffect(() => {
    if (prevKey.current !== tabKey) {
      prevKey.current = tabKey;
      setVisible(false);
      // Force a single frame at opacity 0, then fade in
      requestAnimationFrame(() => setVisible(true));
    }
  }, [tabKey]);

  return (
    <div
      className="h-full w-full"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.12s ease-out',
        willChange: 'opacity',
      }}
    >
      {children}
    </div>
  );
}
