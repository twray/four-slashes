import { getLuminance, lighten } from "polished";
import styled from "styled-components";
import { ChordFunction, CornerProperty } from "../types";
import BevelledContainer from "./BevelledContainer";
import { useVirtualPiano } from "../context/VirtualPianoProvider";

type ChordCardProps = {
  chord: string;
  chordFunction?: ChordFunction;
  progressionIndicators?: Array<"start" | "end">;
};

type StyledChordCardProps = {
  $hasDarkBackground: boolean;
};

const StyledChordCard = styled.div<StyledChordCardProps>`
  width: 200px;
  height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 2rem;
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
    playNote(`${chord[0]}4`, 2000);
  }

  return (
    <BevelledContainer
      $bevelledCorners={bevelledCorners}
      $fill={`linear-gradient(to bottom, ${baseColour}, ${lighten(0.1)(
        baseColour
      )})`}
      onMouseDown={() => handleMouseDown()}
    >
      <StyledChordCard $hasDarkBackground={hasDarkBackground}>
        {chord}
      </StyledChordCard>
    </BevelledContainer>
  );
}
