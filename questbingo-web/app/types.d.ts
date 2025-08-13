declare module 'canvas-confetti' {
  type ConfettiOptions = {
    particleCount?: number;
    spread?: number;
    origin?: { x?: number; y?: number };
    zIndex?: number;
    angle?: number;
    startVelocity?: number;
  };
  const confetti: (opts?: ConfettiOptions) => void;
  export default confetti;
}