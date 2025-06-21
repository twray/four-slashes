import styled from "styled-components";
import ChordCard from "./components/ChordCard";
import PlayPauseButton from "./components/PlayPauseButton";
import VirtualKeyboard from "./components/VirtualKeyboard";
import { VirtualPianoProvider } from "./context/VirtualPianoProvider";
import "./index.css";

const StyledApp = styled.main`
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  justify-content: center;
  align-items: center;
  min-height: 100dvh;
`;

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

function App() {
  return (
    <VirtualPianoProvider>
      <StyledApp>
        <Chords>
          <ChordCard
            chord="Dm"
            progressionIndicators={["start"]}
            chordFunction="subdominant"
          />
          <ChordCard chord="Em" chordFunction="subdominant" />
          <ChordCard chord="F" chordFunction="subdominant" />
          <ChordCard
            chord="G"
            progressionIndicators={["end"]}
            chordFunction="dominant"
          />
        </Chords>
        <Controls>
          <PlayPauseButton />
          <VirtualKeyboard />
        </Controls>
      </StyledApp>
    </VirtualPianoProvider>
  );
}

export default App;
