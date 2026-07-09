import { motion } from 'framer-motion';
import { cardRank, cardSuit } from '../../engine/games/hilo';

const RANK_GLYPHS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_GLYPHS = ['♠', '♥', '♦', '♣'];
const SUIT_RED: Record<number, boolean> = { 0: false, 1: true, 2: true, 3: false };

interface CardVisualProps {
  cardIndex: number;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE: Record<string, string> = {
  sm: 'h-24 w-16 text-xl',
  md: 'h-36 w-24 text-3xl',
  lg: 'h-48 w-32 text-5xl',
};

/** Static face-up card. */
export function CardFace({ cardIndex, size = 'md' }: CardVisualProps) {
  const rank = RANK_GLYPHS[cardRank(cardIndex) - 1];
  const suit = cardSuit(cardIndex);
  const red = SUIT_RED[suit];
  const color = red ? 'text-rose-500' : 'text-slate-900';
  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-xl border border-black/10 bg-gradient-to-br from-white to-slate-100 shadow-[0_10px_24px_rgba(0,0,0,0.5)] ${SIZE[size]}`}
    >
      <span className={`absolute left-2 top-1 text-base font-black leading-none ${color}`}>{rank}</span>
      <span className={`font-black ${color}`}>{SUIT_GLYPHS[suit]}</span>
      <span className={`absolute bottom-1 right-2 rotate-180 text-base font-black leading-none ${color}`}>{rank}</span>
    </div>
  );
}

export function CardBack({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl border border-white/20 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 shadow-[0_10px_24px_rgba(0,0,0,0.5)] ${SIZE[size]}`}
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0 6px, transparent 6px 12px)',
      }}
    >
      <span className="text-2xl opacity-80">♠</span>
    </div>
  );
}

interface PlayingCardProps {
  cardIndex: number;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Stagger the deal-in animation. */
  index?: number;
}

/**
 * A card that slides/deals in and flips between back and face. Toggle
 * `faceDown` to false to flip a hole card up. Used by Blackjack & Hilo.
 */
export function PlayingCard({ cardIndex, faceDown = false, size = 'md', index = 0 }: PlayingCardProps) {
  return (
    <motion.div
      initial={{ y: -40, opacity: 0, rotate: -8 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: index * 0.12 }}
      className={SIZE[size]}
      style={{ perspective: 700 }}
    >
      <motion.div
        animate={{ rotateY: faceDown ? 180 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}
      >
        <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}>
          <CardFace cardIndex={cardIndex} size={size} />
        </div>
        <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', inset: 0 }}>
          <CardBack size={size} />
        </div>
      </motion.div>
    </motion.div>
  );
}
