import { motion } from 'framer-motion';

export default function MaybeFadeIn({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return <>{children}</>;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      {children}
    </motion.div>
  );
}
