import { ComponentPropsWithoutRef, type ReactNode } from "react";
import styled from "styled-components";
import { CornerProperty } from "../types";

type BevelledContainerProps = {
  children: ReactNode;
  $bevelledCorners?: CornerProperty[];
  $fill?: string;
} & ComponentPropsWithoutRef<"div">;

const BevelledContentWrapper = styled.div`
  min-width: 10rem;
  min-height: 2rem;
  filter: drop-shadow(0 0 0.5rem rgba(35, 35, 35, 0.05));
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
`;

export default function BevelledContainer(props: BevelledContainerProps) {
  return (
    <BevelledContentWrapper>
      <BevelledContent {...props} />
    </BevelledContentWrapper>
  );
}
