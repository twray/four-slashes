import OpenAI from "openai";
import { Chord, isChord } from "../utils/chord";

const model = "gpt-4";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Only for development - see security note below
});

type ChordGenerationParams = {
  key?: string;
  style?: "jazz" | "pop" | "classical" | "blues" | "rock";
  numberOfChords?: number;
  mood?: string;
};

export async function generateChordProgression(
  params: ChordGenerationParams
): Promise<Chord[]> {
  const {
    key = "C",
    style = "pop",
    numberOfChords = 4,
    mood = "uplifting",
  } = params;

  const prompt = `Generate a ${numberOfChords}-chord progression in the key of ${key} ${style} music.
The progression should feel ${mood}.
Return ONLY the chord symbols separated by commas, with no explanation or additional text.
Use standard chord notation (e.g., "Cmaj7, Am7, Dm7, G7" or "C, F, G, Am").
Ensure all chords are valid and use proper notation with flats (b) and sharps (#) where needed.`;

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a music theory expert. Generate chord progressions using standard notation. Return only chord symbols separated by commas.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8, // Higher temperature for more creative progressions
      max_tokens: 100,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error("No response from OpenAI");
    }

    // Parse the response and validate chords
    const chords = response
      .split(",")
      .map((chord) => chord.trim())
      .filter((chord) => isChord(chord)) as Chord[];

    if (chords.length === 0) {
      throw new Error("No valid chords generated");
    }

    return chords;
  } catch (error) {
    console.error("Error generating chord progression:", error);
    throw error;
  }
}

export async function generateChordProgressionFromPrompt(
  prompt: string
): Promise<Chord[]> {
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a music theory expert. Generate chord progressions based on user requests. Return only chord symbols separated by commas using standard notation.",
        },
        {
          role: "user",
          content: `${prompt}\n\nReturn a maximum of four chords.\n\nReturn only the chord symbols separated by commas.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 100,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error("No response from OpenAI");
    }

    const chords = response
      .split(",")
      .map((chord) => chord.trim())
      .filter((chord) => isChord(chord)) as Chord[];

    if (chords.length === 0) {
      throw new Error("No valid chords generated");
    }

    return chords;
  } catch (error) {
    console.error("Error generating chord progression:", error);
    throw error;
  }
}
