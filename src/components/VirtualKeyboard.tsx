import { ComponentPropsWithRef, useEffect, useRef } from "react";
import { CgPiano } from "react-icons/cg";
import styled from "styled-components";
import { useVirtualPiano } from "../context/VirtualPianoProvider";
import { isValidPianoKey, Note } from "../utils/music";

type VirtualKeyboardProps = ComponentPropsWithRef<"button">;

const StyledVirtualKeyboard = styled.button`
  -webkit-tap-highlight-color: transparent;
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  background: hsl(0, 0%, 86.66666666666667%);
  cursor: pointer;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  &:disabled {
    opacity: 0.5;
  }
  & > svg {
    width: 2rem;
    height: 2rem;
    color: #666666;
  }
`;

const keyboardMappingsToVirtualKeyboard = {
  "`": "G3",
  A: "G#3",
  Z: "A3",
  S: "A#3",
  X: "B3",
  C: "C4",
  F: "C#4",
  V: "D4",
  G: "D#4",
  B: "E4",
  N: "F4",
  J: "F#4",
  M: "G4",
  K: "G#4",
  ",": "A4",
  O: "A#4",
  ".": "B4",
  "/": "C5",
};

export default function VirtualKeyboard({
  ...htmlButtonProps
}: VirtualKeyboardProps) {
  const { keyUp, keyDown, sustainPedalUp, sustainPedalDown } =
    useVirtualPiano();

  const pressedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleKey = (event: KeyboardEvent, direction: "up" | "down") => {
      if (htmlButtonProps.disabled) return;

      const pressedKeys = pressedKeysRef.current;

      const upperCaseKey =
        event.key.toUpperCase() as keyof typeof keyboardMappingsToVirtualKeyboard;

      if (pressedKeys.has(upperCaseKey) && direction === "down") return;

      if (direction === "down") {
        pressedKeys.add(upperCaseKey);
      } else if (direction === "up") {
        pressedKeys.delete(upperCaseKey);
      }

      const keyDirectionsAndVirtualPianoFunctions = {
        key: { up: keyUp, down: keyDown },
        pedal: { up: sustainPedalUp, down: sustainPedalDown },
      };

      if (event.code === "Space") {
        keyDirectionsAndVirtualPianoFunctions.pedal[direction]();
      } else if (
        Object.keys(keyboardMappingsToVirtualKeyboard).includes(upperCaseKey)
      ) {
        const note = keyboardMappingsToVirtualKeyboard[upperCaseKey];
        if (isValidPianoKey(note)) {
          keyDirectionsAndVirtualPianoFunctions.key[direction](note as Note);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      handleKey(event, "down");
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      handleKey(event, "up");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  });

  return (
    <StyledVirtualKeyboard {...htmlButtonProps}>
      <CgPiano />
    </StyledVirtualKeyboard>
  );
}
