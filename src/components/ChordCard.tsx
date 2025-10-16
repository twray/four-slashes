import { getLuminance, lighten } from "polished";
import styled from "styled-components";
import { useVirtualPiano } from "../context/VirtualPianoProvider";
import { ChordFunction, CornerProperty } from "../types";
import BevelledContainer from "./BevelledContainer";
import { isNote } from "../utils/music";

type ChordCardProps = {
  chord: string;
  chordFunction?: ChordFunction;
  progressionIndicators?: Array<"start" | "end">;
  isActivelyPlaying?: boolean;
};

type StyledChordCardProps = {
  $hasDarkBackground?: boolean;
  $isActive?: boolean;
};

const StyledChordCard = styled.div<StyledChordCardProps>`
  width: 15rem;
  height: 15rem;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 2.4rem;
  color: ${({ $hasDarkBackground }) =>
    $hasDarkBackground ? "#eeeeee" : "#666666"};
`;

const coloursBasedOnChordFunctions = {
  // tonic: "hsl(10, 76%, 62%)",
  tonic: "hsl(191, 76%, 32%)",
  dominant: "hsl(45, 88%, 56%)",
  subdominant: "hsl(39, 88%, 57%)",
};

export default function ChordCard({
  chord,
  chordFunction,
  progressionIndicators = [],
  isActivelyPlaying = false,
}: ChordCardProps) {
  const { playNote } = useVirtualPiano();

  const bevelledCorners: CornerProperty[] = [
    ...(progressionIndicators.includes("start") ? ["top-left"] : []),
    ...(progressionIndicators.includes("end") ? ["bottom-right"] : []),
  ] as CornerProperty[];

  const baseColour = chordFunction
    ? coloursBasedOnChordFunctions[chordFunction]
    : "#eeeeee";

  const hasDarkBackground = getLuminance(baseColour) < 0.4;

  function handleMouseDown() {
    const rootNote = chord[0];
    if (isNote(rootNote)) playNote(rootNote, 2000);
  }

  return (
    <BevelledContainer
      $bevelledCorners={bevelledCorners}
      $fill={`linear-gradient(to bottom, ${baseColour}, ${lighten(0.1)(
        baseColour
      )})`}
      $isActive={isActivelyPlaying}
      onMouseDown={() => handleMouseDown()}
    >
      <StyledChordCard
        $hasDarkBackground={hasDarkBackground}
        $isActive={isActivelyPlaying}
      >
        {chord}
      </StyledChordCard>
    </BevelledContainer>
  );
}
