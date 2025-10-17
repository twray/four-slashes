import { useEffect, useState } from "react";
import styled from "styled-components";
import ChordPlayer from "./components/ChordPlayer";
import ChordPlayerPrompt from "./components/ChordPlayerPrompt";
import { VirtualPianoProvider } from "./context/VirtualPianoProvider";
import "./index.css";
import { ChordWithFunction } from "./utils/chord";
import { generateChordProgressionFromPrompt } from "./services/aiChordGenerator";

const StyledApp = styled.main`
  display: flex;
  flex-direction: column;
  gap: 5rem;
  justify-content: center;
  align-items: center;
  min-height: 100dvh;
`;

function App() {
  const [chordPrompt, setChordPrompt] = useState("");
  const [chordsWithFunctions, setChordsWithFunctions] = useState<
    ChordWithFunction[]
  >([]);

  useEffect(() => {
    async function fetchChords() {
      try {
        const chords = await generateChordProgressionFromPrompt(chordPrompt);
        // For simplicity, assign chord functions in a basic way
        const chordsWithFunc: ChordWithFunction[] = chords.map(
          (chord, index) => {
            const chordFunction = index % 2 ? "dominant" : "subdominant";
            return { chord, chordFunction };
          }
        );
        setChordsWithFunctions(chordsWithFunc);
      } catch (error) {
        console.error("Failed to fetch chords:", error);
      }
    }

    if (chordPrompt.length > 5) fetchChords();
  }, [chordPrompt]);

  return (
    <VirtualPianoProvider>
      <StyledApp>
        <ChordPlayerPrompt onSubmit={setChordPrompt} />
        <ChordPlayer chords={chordsWithFunctions} />
      </StyledApp>
    </VirtualPianoProvider>
  );
}

export default App;
