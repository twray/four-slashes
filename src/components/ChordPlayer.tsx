import styled from "styled-components";
import ChordCard from "./ChordCard";
import PlayPauseButton from "./PlayPauseButton";
import VirtualKeyboard from "./VirtualKeyboard";
import { useEffect, useRef, useState } from "react";
import { useVirtualPiano } from "../context/VirtualPianoProvider";
import { SequencerController } from "../hooks/useSequencer";
import { ChordFunction } from "../types";

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

const chords = [
  { chord: "Dm", chordFunction: "subdominant" },
  { chord: "Em", chordFunction: "subdominant" },
  { chord: "F", chordFunction: "subdominant" },
  { chord: "G", chordFunction: "dominant" },
];

export default function ChordPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [indexOfActiveChord, setIndexOfActiveChord] = useState<number | null>(
    null
  );
  const { createSequenceWithNotation, virtualPianoIsReady } = useVirtualPiano();
  const sequencerRef = useRef<SequencerController | null>(null);

  useEffect(() => {
    const sequence = createSequenceWithNotation(
      "key=Eb bpm=120 autoSustain=on" +
        "| :1 D-2_D-1_D_F_A | E-2_E-1_E_G_B | F-2_F-1_F_A_C+1 | G-2_G-1_G_B_D+1",
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
            key={chord}
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
