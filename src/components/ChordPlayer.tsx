import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useVirtualPiano } from "../context/VirtualPianoProvider";
import { SequencerController } from "../hooks/useSequencer";
import { ChordFunction } from "../types";
import {
  Chord,
  generateArrangementAsNotationForChords,
  isChord,
} from "../utils/chord";
import ChordCard from "./ChordCard";
import PlayPauseButton from "./PlayPauseButton";
import VirtualKeyboard from "./VirtualKeyboard";

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

const chordsBase = ["Am", "G", "D", "E7"];

const chords = chordsBase.map((chord, index) => ({
  chord,
  chordFunction: (index - 2) % 3 ? "dominant" : "subdominant",
}));

export default function ChordPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [indexOfActiveChord, setIndexOfActiveChord] = useState<number | null>(
    null
  );
  const { createSequenceWithNotation, virtualPianoIsReady } = useVirtualPiano();
  const sequencerRef = useRef<SequencerController | null>(null);

  // TODO: Add runs and enclosures for leading notes
  // Add glissandro effects, arpeggio runs for final tonic chord

  useEffect(() => {
    chords.forEach(({ chord }) => {
      if (!isChord(chord)) {
        console.warn(`Chord "${chord}" is not a supported chord.`);
      }
    });

    const chordsAsNotation = generateArrangementAsNotationForChords(
      chords
        .filter(({ chord }) => isChord(chord))
        .map(({ chord }) => chord) as Chord[]
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
  }, [createSequenceWithNotation]);

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
    <>
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
        <VirtualKeyboard />
      </Controls>
    </>
  );
}
