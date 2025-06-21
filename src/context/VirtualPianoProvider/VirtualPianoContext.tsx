import { createContext } from "react";
import { type Note } from "./../../utils/music";
import {
  type SequencerController,
  type Bar,
  type SequencerControlEvent,
  type SequencerBarEvent,
} from "../../hooks/useSequencer";

type VirtualPianoContextType = {
  virtualPianoIsReady: boolean;
  createSequence: (
    bars: Bar[],
    onEvent?: (event: SequencerControlEvent | SequencerBarEvent) => void
  ) => SequencerController;
  createSequenceWithNotation: (
    notation: string,
    onEvent?: (event: SequencerControlEvent | SequencerBarEvent) => void
  ) => SequencerController;
  playNote: (note: Note, duration?: number) => void;
  keyDown: (note: Note) => void;
  keyUp: (note: Note) => void;
  sustainPedalUp: () => void;
  sustainPedalDown: () => void;
};

export const VirtualPianoContext = createContext<
  VirtualPianoContextType | undefined
>(undefined);
