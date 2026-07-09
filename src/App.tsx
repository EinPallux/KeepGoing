import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRunStore } from './store/runStore';
import type { FloorRecord } from './engine/run';
import { MenuScreen } from './ui/screens/MenuScreen';
import { RunMapScreen } from './ui/screens/RunMapScreen';
import { GameTableScreen } from './ui/screens/GameTableScreen';
import { FloorClearScreen } from './ui/screens/FloorClearScreen';
import { ShopScreen } from './ui/screens/ShopScreen';
import { SummaryScreen } from './ui/screens/SummaryScreen';
import { AmbientBackground } from './ui/components/AmbientBackground';
import { SoundToggle } from './ui/components/SoundToggle';
import { initAudioUnlock } from './ui/fx/sound';

function App() {
  const run = useRunStore((s) => s.run);
  const revealing = useRunStore((s) => s.revealing);
  const currentRound = useRunStore((s) => s.currentRound);
  const endReveal = useRunStore((s) => s.endReveal);
  const [floorClearRecord, setFloorClearRecord] = useState<FloorRecord | null>(null);
  const [showShop, setShowShop] = useState(false);
  const prevHistoryLength = useRef<number | null>(null);

  useEffect(() => {
    initAudioUnlock();
  }, []);

  // Detect a freshly cleared floor. useLayoutEffect (not useEffect) so the
  // FloorClearScreen is committed before the browser paints - otherwise the
  // one frame between a reveal ending and this firing flashes the RunMap.
  useLayoutEffect(() => {
    if (!run) {
      prevHistoryLength.current = null;
      return;
    }
    // Seed from the (possibly persisted) history the first time we see a run, so
    // a reload mid-run doesn't re-trigger a floor-clear that already happened.
    if (prevHistoryLength.current === null) {
      prevHistoryLength.current = run.history.length;
      return;
    }
    if (revealing) return; // let the table's reveal finish first
    if (run.history.length > prevHistoryLength.current && run.status === 'in-progress') {
      setFloorClearRecord(run.history[run.history.length - 1]);
    }
    prevHistoryLength.current = run.history.length;
  }, [run, revealing]);

  // Failsafe: never let a stalled reveal wedge the run.
  useEffect(() => {
    if (!revealing) return;
    const t = setTimeout(() => endReveal(), 6000);
    return () => clearTimeout(t);
  }, [revealing, endReveal]);

  let screen: React.ReactNode;

  if (!run) {
    screen = <MenuScreen />;
  } else if (revealing && currentRound) {
    // Keep the table mounted so its reveal animation can play to completion,
    // even on the last play of a floor (where activeTableId has already cleared).
    screen = <GameTableScreen />;
  } else if (run.status === 'won' || run.status === 'lost') {
    screen = <SummaryScreen />;
  } else if (floorClearRecord) {
    screen = (
      <FloorClearScreen
        record={floorClearRecord}
        onContinue={() => {
          setFloorClearRecord(null);
          setShowShop(true);
        }}
      />
    );
  } else if (showShop) {
    screen = <ShopScreen onContinue={() => setShowShop(false)} />;
  } else if (!run.activeTableId) {
    screen = <RunMapScreen />;
  } else {
    screen = <GameTableScreen />;
  }

  return (
    <>
      <AmbientBackground />
      <SoundToggle />
      <div id="kg-app-root" className="kg-scroll relative h-screen w-screen overflow-y-auto">
        {screen}
      </div>
    </>
  );
}

export default App;
