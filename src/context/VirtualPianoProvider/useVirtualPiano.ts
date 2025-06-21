import { useContext } from "react";
import { VirtualPianoContext } from "./VirtualPianoContext";

export function useVirtualPiano() {
  const context = useContext(VirtualPianoContext);
  if (!context) {
    throw new Error(
      "useVirtualPiano must be used within an VirtualPianoProvider"
    );
  }
  return context;
}
