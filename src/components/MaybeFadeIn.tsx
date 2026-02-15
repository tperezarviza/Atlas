import { useRef, useEffect, useState } from 'react';

export default function MaybeFadeIn({ show, children }: { show: boolean; children: React.ReactNode }) {
  const [visible, setVisible] = useState(!show);
  const mounted = useRef(false);

  useEffect(() => {
    if (show && !mounted.current) {
      mounted.current = true;
      requestAnimationFrame(() => setVisible(true));
    }
  }, [show]);

  if (!show) return <>{children}</>;

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.12s ease-out',
      }}
    >
      {children}
    </div>
  );
}
