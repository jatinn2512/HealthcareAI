import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

const transition = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1] as const,
};

const PageTransition = ({ children }: PageTransitionProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={transition}
    className="will-change-opacity"
  >
    {children}
  </motion.div>
);

export default PageTransition;
