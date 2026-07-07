import { cardRank, cardSuit } from '../../engine/games/hilo';

const RANK_GLYPHS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_GLYPHS = ['♠', '♥', '♦', '♣'];
const SUIT_COLOR: Record<number, string> = { 0: 'text-white', 1: 'text-rose-400', 2: 'text-rose-400', 3: 'text-white' };

interface CardFaceProps {
  cardIndex: number;
}

export function CardFace({ cardIndex }: CardFaceProps) {
  const rank = RANK_GLYPHS[cardRank(cardIndex) - 1];
  const suit = cardSuit(cardIndex);
  return (
    <div className="flex h-28 w-20 flex-col items-center justify-center rounded-xl border border-white/20 bg-white/95 shadow-lg">
      <span className={`text-2xl font-black ${SUIT_COLOR[suit]}`}>{rank}</span>
      <span className={`text-3xl ${SUIT_COLOR[suit]}`}>{SUIT_GLYPHS[suit]}</span>
    </div>
  );
}

export function CardBack() {
  return (
    <div className="flex h-28 w-20 items-center justify-center rounded-xl border border-white/20 bg-gradient-to-br from-violet-600 to-pink-600 shadow-lg">
      <span className="text-2xl">?</span>
    </div>
  );
}
