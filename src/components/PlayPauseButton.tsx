import {
  type ComponentPropsWithoutRef,
  MouseEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
import { HiMiniPause, HiMiniPlay } from "react-icons/hi2";
import styled, { css, keyframes } from "styled-components";

type PlayPauseButtonProps = {
  isPlaying: boolean;
} & ComponentPropsWithoutRef<"button">;

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
  isPlaying = false,
  onClick,
  ...htmlButtonProps
}: PlayPauseButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<number | null>(null);

  function handleButtonClick(event: MouseEvent<HTMLButtonElement>) {
    setIsAnimating(true);
    onClick?.(event);

    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  }

  return (
    <StyledPlayPauseButton
      $isAnimating={isAnimating}
      onClick={handleButtonClick}
      {...htmlButtonProps}
    >
      {!isPlaying ? <StyledPlayIcon /> : <HiMiniPause />}
    </StyledPlayPauseButton>
  );
}
