import { useEffect, useRef, useState } from 'react';
import { useRunStore } from './store/runStore';
import type { FloorRecord } from './engine/run';
import { MenuScreen } from './ui/screens/MenuScreen';
import { RunMapScreen } from './ui/screens/RunMapScreen';
import { GameTableScreen } from './ui/screens/GameTableScreen';
import { FloorClearScreen } from './ui/screens/FloorClearScreen';
import { ShopScreen } from './ui/screens/ShopScreen';
import { SummaryScreen } from './ui/screens/SummaryScreen';

function App() {
  const run = useRunStore((s) => s.run);
  const [floorClearRecord, setFloorClearRecord] = useState<FloorRecord | null>(null);
  const [showShop, setShowShop] = useState(false);
  const prevHistoryLength = useRef(0);

  useEffect(() => {
    if (!run) {
      prevHistoryLength.current = 0;
      return;
    }
    if (run.history.length > prevHistoryLength.current && run.status === 'in-progress') {
      setFloorClearRecord(run.history[run.history.length - 1]);
    }
    prevHistoryLength.current = run.history.length;
  }, [run]);

  let screen: React.ReactNode;

  if (!run) {
    screen = <MenuScreen />;
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

  return <div className="h-screen w-screen overflow-y-auto bg-[#0b0b12]">{screen}</div>;
}

export default App;
