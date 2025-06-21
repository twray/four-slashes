import { type ReactNode, useEffect, useRef, useState } from "react";
import { HiMiniPause, HiMiniPlay } from "react-icons/hi2";
import styled, { css, keyframes } from "styled-components";
import { useVirtualPiano } from "../context/VirtualPianoProvider";
import { SequencerController } from "../hooks/useSequencer";

type PlayPauseButtonProps = {
  onPlay?: () => void;
  onPause?: () => void;
};

const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
`;

type StyledPlayPauseButtonProps = {
  children: ReactNode;
  $isAnimating: boolean;
};

const StyledPlayPauseButton = styled.button<StyledPlayPauseButtonProps>`
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
  transition: opacity 0.3s ease-in-out;
  &:disabled {
    opacity: 0.5;
  }
  animation: ${({ $isAnimating }) =>
    $isAnimating
      ? css`
          ${pulseAnimation} 0.3s ease-in-out
        `
      : "none"};
  & > svg {
    width: 2rem;
    height: 2rem;
    color: #666666;
  }
`;

const StyledPlayIcon = styled(HiMiniPlay)`
  margin-left: 0.25rem;
`;

export default function PlayPauseButton({
  onPlay,
  onPause,
}: PlayPauseButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<number | null>(null);

  const { createSequenceWithNotation, virtualPianoIsReady } = useVirtualPiano();
  const sequencerRef = useRef<SequencerController | null>(null);

  useEffect(() => {
    const sequence = createSequenceWithNotation(
      "key=Eb bpm=120 autoSustain=on" +
        "| :1 D-2_D-1_D_F_A | E-2_E-1_E_G_B | F-2_F-1_F_A_C+1 | G-2_G-1_G_B_D+1",
      (event) => {
        if (event.type === "sequenceEnd") {
          setIsPlaying(false);
        }
        if (event.type === "barStart") {
          console.log(`Bar ${event.barIndex + 1} started`);
        }
      }
    );

    sequencerRef.current = sequence;
  }, [createSequenceWithNotation]);

  function handleButtonClick() {
    setIsAnimating(true);
    setIsPlaying((prev) => !prev);

    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    setTimeout(() => {
      setIsAnimating(false);
    }, 300);

    if (!isPlaying) {
      sequencerRef.current?.playSequence();
      onPlay?.();
    } else {
      sequencerRef.current?.pauseSequence();
      onPause?.();
    }
  }

  return (
    <StyledPlayPauseButton
      $isAnimating={isAnimating}
      onClick={() => handleButtonClick()}
      disabled={!virtualPianoIsReady}
    >
      {!isPlaying ? <StyledPlayIcon /> : <HiMiniPause />}
    </StyledPlayPauseButton>
  );
}
