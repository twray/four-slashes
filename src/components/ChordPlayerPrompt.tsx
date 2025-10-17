import { useState, ChangeEvent } from "react";
import styled from "styled-components";

const StyledChordPlayerPromptSearchInput = styled.input`
  width: 40rem;
  height: 4rem;
  border: none;
  border-radius: 2rem;
  background: rgba(221, 221, 221, 0.5);
  padding: 0 2rem;
  font-size: 1.2rem;
  font-weight: 500;
`;

type ChordPlayerPromptProps = {
  onSubmit?: (value: string) => void;
};

function ChordPlayerPrompt({ onSubmit }: ChordPlayerPromptProps) {
  const [value, setValue] = useState("");

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setValue(event.target.value);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (onSubmit) {
      onSubmit(value);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <StyledChordPlayerPromptSearchInput
        type="search"
        placeholder="Your idea here ..."
        value={value}
        onChange={handleChange}
      />
    </form>
  );
}

export default ChordPlayerPrompt;
