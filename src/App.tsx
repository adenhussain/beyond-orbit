import type { ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TimelineExplorer } from './components/TimeMachine/TimelineExplorer';
import { AppShell } from './components/UI/AppShell';
import { Exploration } from './pages/Exploration';
import { FailureAutopsy } from './pages/FailureAutopsy';
import { FlightOperations } from './pages/FlightOperations';
import { LaunchSequence } from './pages/LaunchSequence';
import { MainMenu } from './pages/MainMenu';
import { MissionBriefing } from './pages/MissionBriefing';
import { MissionOutcome } from './pages/MissionOutcome';
import { MissionSelection } from './pages/MissionSelection';
import { ReviewBoard } from './pages/ReviewBoard';
import { SpacecraftBuilder } from './pages/SpacecraftBuilder';
import { useGame } from './state/useGame';
import type { Screen } from './types/gameState';

const SCREENS: Record<Screen, ComponentType> = {
  menu: MainMenu,
  missions: MissionSelection,
  briefing: MissionBriefing,
  explore: Exploration,
  builder: SpacecraftBuilder,
  launch: LaunchSequence,
  flight: FlightOperations,
  outcome: MissionOutcome,
  autopsy: FailureAutopsy,
  review: ReviewBoard,
};

export default function App() {
  const { state } = useGame();
  const ScreenComponent = SCREENS[state.screen];

  return (
    <AppShell>
      <AnimatePresence mode="wait">
        <motion.div
          key={state.screen}
          className="h-full"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <ScreenComponent />
        </motion.div>
      </AnimatePresence>
      {state.timeMachineOpen && <TimelineExplorer />}
    </AppShell>
  );
}
