"use client";

import { motion } from "framer-motion";

export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* dotted grid */}
      <div className="grid-bg absolute inset-0 opacity-60" />

      {/* radial vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(45,230,230,0.10), transparent 55%), radial-gradient(100% 100% at 50% 100%, rgba(7,9,13,0.9), transparent 40%)",
        }}
      />

      {/* floating glow orbs */}
      <motion.div
        className="absolute -left-20 top-32 h-[26rem] w-[26rem] rounded-full blur-[120px]"
        style={{ background: "rgba(45,230,230,0.10)" }}
        animate={{ y: [0, -30, 0], x: [0, 20, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-6rem] top-[40rem] h-[30rem] w-[30rem] rounded-full blur-[140px]"
        style={{ background: "rgba(21,184,201,0.08)" }}
        animate={{ y: [0, 40, 0], x: [0, -20, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
