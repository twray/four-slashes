import { ComponentPropsWithoutRef } from "react";
import styled, { css } from "styled-components";
import { CornerProperty } from "../types";

type BevelledContainerProps = {
  $bevelledCorners?: CornerProperty[];
  $fill?: string;
  $isActive?: boolean;
} & ComponentPropsWithoutRef<"div">;

type BevelledContentWrapperProps = {
  $isActive?: boolean;
} & ComponentPropsWithoutRef<"div">;

const BevelledContentWrapper = styled.div<BevelledContentWrapperProps>`
  min-width: 10rem;
  min-height: 2rem;
  filter: drop-shadow(0 0 0.5rem rgba(35, 35, 35, 0.05));
  ${({ $isActive }) =>
    $isActive &&
    css`
      position: relative;
      z-index: 10;
    `}
`;

const BevelledContent = styled.div<BevelledContainerProps>`
  background: ${({ $fill = "#fff" }) => $fill};
  clip-path: ${({ $bevelledCorners = [] }) => {
    const points = [
      ...($bevelledCorners.includes("top-left")
        ? ["0 1rem", "1rem 0"]
        : ["0 0"]),
      ...($bevelledCorners.includes("top-right")
        ? ["calc(100% - 1rem) 0", "100% 1rem"]
        : ["100% 0"]),
      ...($bevelledCorners.includes("bottom-right")
        ? ["100% calc(100% - 1rem)", "calc(100% - 1rem) 100%"]
        : ["100% 100%"]),
      ...($bevelledCorners.includes("bottom-left")
        ? ["1rem 100%", "0 calc(100% - 1rem)"]
        : ["0 100%"]),
    ];
    return $bevelledCorners ? `polygon(${points.join(", ")})` : "none";
  }};
  transition: transform 0.3s ease-in-out;
  transform: ${({ $isActive }) => ($isActive ? "scale(1.2)" : "scale(1)")};
`;

export default function BevelledContainer({
  $bevelledCorners,
  $fill,
  $isActive,
  children,
}: BevelledContainerProps) {
  return (
    <BevelledContentWrapper $isActive={$isActive}>
      <BevelledContent
        $bevelledCorners={$bevelledCorners}
        $fill={$fill}
        $isActive={$isActive}
      >
        {children}
      </BevelledContent>
    </BevelledContentWrapper>
  );
}
