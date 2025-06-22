import styled from "styled-components";
import ChordPlayer from "./components/ChordPlayer";
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

function App() {
  return (
    <VirtualPianoProvider>
      <StyledApp>
        <ChordPlayer />
      </StyledApp>
    </VirtualPianoProvider>
  );
}

export default App;
