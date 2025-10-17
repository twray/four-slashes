import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

import { useVirtualPiano } from "../context/VirtualPianoProvider";
import { SequencerController } from "../hooks/useSequencer";
import {
  ChordFunction,
  ChordWithFunction,
  generateArrangementAsNotationForChords,
  isChord,
} from "../utils/chord";

import ChordCard from "./ChordCard";
import PlayPauseButton from "./PlayPauseButton";
import VirtualKeyboard from "./VirtualKeyboard";

const StyledChordPlayer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3rem;
  justify-content: center;
  align-items: center;
`;

const Chords = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1rem;
`;

const Controls = styled.div`
  display: flex;
  flex-direction: row;
  gap: 2rem;
`;

type ChordPlayerProps = {
  chords: ChordWithFunction[];
};

export default function ChordPlayer({ chords = [] }: ChordPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [indexOfActiveChord, setIndexOfActiveChord] = useState<number | null>(
    null
  );
  const { createSequenceWithNotation, virtualPianoIsReady } = useVirtualPiano();
  const sequencerRef = useRef<SequencerController | null>(null);

  // TODO: Add runs and enclosures for leading notes
  // Add glissandro effects, arpeggio runs for final tonic chord

  useEffect(() => {
    if (chords.length === 0) return;

    const chordsAsNotation = generateArrangementAsNotationForChords(
      chords.filter(({ chord }) => isChord(chord)).map(({ chord }) => chord)
    );

    const sequence = createSequenceWithNotation(
      "bpm=120 autoSustain=on" + `| ${chordsAsNotation}`,
      (event) => {
        if (event.type === "sequenceEnd") {
          setIsPlaying(false);
          setIndexOfActiveChord(null);
        }
        if (event.type === "barStart") {
          setIndexOfActiveChord(event.barIndex);
        }
      }
    );

    sequencerRef.current = sequence;
  }, [chords, createSequenceWithNotation]);

  function handlePlayPauseButtonClick() {
    if (!virtualPianoIsReady) return;

    if (isPlaying) {
      sequencerRef.current?.pauseSequence();
      setIsPlaying(false);
    } else {
      sequencerRef.current?.playSequence();
      setIsPlaying(true);
    }
  }

  return (
    chords.length > 0 && (
      <StyledChordPlayer>
        <Chords>
          {chords.map(({ chord, chordFunction }, index) => (
            <ChordCard
              key={`chord-${index}`}
              chord={chord}
              chordFunction={chordFunction as ChordFunction}
              isActivelyPlaying={isPlaying && indexOfActiveChord === index}
              progressionIndicators={
                index === 0
                  ? ["start"]
                  : index === chords.length - 1
                  ? ["end"]
                  : []
              }
            />
          ))}
        </Chords>
        <Controls>
          <PlayPauseButton
            isPlaying={isPlaying}
            disabled={!virtualPianoIsReady}
            onClick={handlePlayPauseButtonClick}
          />
          <VirtualKeyboard disabled={true} />
        </Controls>
      </StyledChordPlayer>
    )
  );
}
