import { AnimatePresence, motion } from 'framer-motion';

interface TabPanelProps {
  tabKey: string;
  children: React.ReactNode;
}

export default function TabPanel({ tabKey, children }: TabPanelProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="h-full w-full" style={{ willChange: "opacity" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
