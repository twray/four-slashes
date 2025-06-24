import {
  Scale as ScaleUtil,
  Note as NoteUtil,
  Interval as IntervalUtil,
} from "tonal"; // Importing Scale and Note from the Tonal library

import pianoKeys from "../data/pianoKeys.json";

export type NoteLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G";
export type Accidental = "#" | "b" | "n" | "";
export type Octave = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

export type PianoKey = (typeof pianoKeys)[number];
export type PitchClass = `${NoteLetter}${Accidental}`;
export type Note = `${NoteLetter}${Accidental}${Octave}`;
export type RelativeNote = `${NoteLetter}${Accidental}${"-" | "+" | ""}${
  | 1
  | 2
  | 3
  | 4}`;
export type NoteDuration = 1 | 2 | 4 | 8 | 16 | 32 | 64;
export type TimeSignature = `${number}/${number}`;

export type KeySignature =
  | "C"
  | "G"
  | "D"
  | "A"
  | "E"
  | "B"
  | "F#"
  | "C#"
  | "F"
  | "Bb"
  | "Eb"
  | "Ab"
  | "Db"
  | "Gb";

export type Key = `${KeySignature}${"m" | ""}`;

export type NoteWithDuration = {
  pitch: Note;
  duration: NoteDuration;
  dotted?: boolean;
  tied?: boolean;
};

export type RestWithDuration = {
  duration: NoteDuration;
  dotted?: boolean;
};

function isNoteWithDuration(
  value: NoteWithDuration | RestWithDuration
): value is NoteWithDuration {
  return (value as NoteWithDuration).pitch !== undefined;
}

export function isNote(note: string): note is Note {
  const regex = /^[A-G][#bn]?[0-8]$/;
  return regex.test(note);
}

export function isPianoNote(note: string): note is Note {
  return isNote(note) && noteToPianoKey(note) !== undefined;
}

export function isRelativeNote(note: string): note is RelativeNote {
  const regex = /^[A-G][#bn]?([-+][1-4])?$/;
  return regex.test(note);
}

export function relativeNoteToAbsoluteNote(
  relativeNote: RelativeNote
): Note | null {
  const note = relativeNote.match(/^([A-G])([#bn]?)/)?.[0];
  const operator = relativeNote.match(/([-+])/)?.[0];
  const relativeOctave = relativeNote.match(/([1-4])$/)?.[0] ?? "0";

  if (!note) return null;

  let absoluteOctave: Octave | null = null;

  switch (operator) {
    case "+":
      absoluteOctave = (parseInt(relativeOctave) + 4).toString() as Octave;
      break;
    case "-":
      absoluteOctave = (-parseInt(relativeOctave) + 4).toString() as Octave;
      break;
    case undefined:
      absoluteOctave = "4";
      break;
    default:
      return null;
  }

  return `${note}${absoluteOctave}` as Note;
}

export function isNoteDuration(
  noteDuration: number
): noteDuration is NoteDuration {
  return [1, 2, 4, 8, 16, 32, 64].includes(noteDuration);
}

export function isTimeSignature(
  timeSignature: string
): timeSignature is TimeSignature {
  const regex = /^\d+\/\d+$/;
  return regex.test(timeSignature);
}

export function isKeySignature(
  keySignature: string
): keySignature is KeySignature {
  const validKeySignatures: KeySignature[] = [
    "C",
    "G",
    "D",
    "A",
    "E",
    "B",
    "F#",
    "C#",
    "F",
    "Bb",
    "Eb",
    "Ab",
    "Db",
    "Gb",
  ];
  return validKeySignatures.includes(keySignature as KeySignature);
}

export function isValidPianoKey(value: unknown): value is PianoKey {
  return typeof value === "string" && pianoKeys.includes(value as PianoKey);
}

export function noteToPianoKey(note: Note): PianoKey | undefined {
  if (pianoKeys.includes(note as PianoKey)) return note as PianoKey;

  if (note.length === 3) {
    const [noteLetter, accidental, octave] = note.split("") as [
      NoteLetter,
      Accidental,
      Octave
    ];

    const noteWithoutAccidental = `${noteLetter}${octave}`;
    const indexOfNoteWithoutAccidentalInPianoKeys = pianoKeys.indexOf(
      noteWithoutAccidental
    );

    if (
      [0, pianoKeys.length - 1].includes(
        indexOfNoteWithoutAccidentalInPianoKeys
      )
    ) {
      return;
    }

    switch (accidental) {
      case "#":
        return pianoKeys[
          indexOfNoteWithoutAccidentalInPianoKeys + 1
        ] as PianoKey;
      case "b":
        return pianoKeys[
          indexOfNoteWithoutAccidentalInPianoKeys - 1
        ] as PianoKey;
      case "n":
        return pianoKeys[indexOfNoteWithoutAccidentalInPianoKeys] as PianoKey;
      default:
        return;
    }
  }
}

export function getBarLengthInMsForTimeSignature(
  bpm: number,
  timeSignature: TimeSignature
): number {
  const [beatsPerBar, beatUnit] = timeSignature.split("/").map(Number);
  const quarterNoteDurationInMs = (60 / bpm) * 1000;

  return (beatsPerBar * quarterNoteDurationInMs) / (4 / beatUnit);
}

export function getTotalNoteOrRestDurationInMs(
  bpm: number,
  noteOrRestWithDuration: NoteWithDuration | RestWithDuration,
  nextNoteWithDuration?: NoteWithDuration
): number {
  const { duration, dotted } = noteOrRestWithDuration;
  const quarterNoteDurationInMs = (60 / bpm) * 1000;

  const noteDurationInMs =
    (quarterNoteDurationInMs / (duration / 4)) * (dotted ? 1.5 : 1) +
    (isNoteWithDuration(noteOrRestWithDuration) &&
    noteOrRestWithDuration.tied &&
    nextNoteWithDuration?.pitch === noteOrRestWithDuration.pitch
      ? getTotalNoteOrRestDurationInMs(bpm, nextNoteWithDuration)
      : 0);

  return noteDurationInMs;
}

export function getRestsForDurationInMs(
  bpm: number,
  duration: number
): RestWithDuration[] {
  const quarterNoteDurationInMs = (60 / bpm) * 1000;
  const restDurations: NoteDuration[] = [1, 2, 4, 8, 16, 32, 64];
  const rests: RestWithDuration[] = [];

  let remainingDuration = duration;

  while (remainingDuration > 0) {
    for (const restDuration of restDurations) {
      const baseDurationInMs = quarterNoteDurationInMs / (restDuration / 4);

      const dottedDurationInMs = baseDurationInMs * 1.5;
      if (dottedDurationInMs <= remainingDuration) {
        rests.push({ duration: restDuration, dotted: true });
        remainingDuration -= dottedDurationInMs;
        break;
      }

      if (baseDurationInMs <= remainingDuration) {
        rests.push({ duration: restDuration });
        remainingDuration -= baseDurationInMs;
        break;
      }
    }
  }

  return rests;
}

export function adjustNotesToKeySignature(
  keySignature: KeySignature,
  notes: Note[]
): Note[] {
  const keySignaturesAndAdjustments = {
    C: { adjustments: [] },
    G: { adjustments: ["F#"] },
    D: { adjustments: ["F#", "C#"] },
    A: { adjustments: ["F#", "C#", "G#"] },
    E: { adjustments: ["F#", "C#", "G#", "D#"] },
    B: { adjustments: ["F#", "C#", "G#", "D#", "A#"] },
    F: { adjustments: ["Bb"] },
    Bb: { adjustments: ["Bb", "Eb"] },
    Eb: { adjustments: ["Bb", "Eb", "Ab"] },
    Ab: { adjustments: ["Bb", "Eb", "Ab", "Db"] },
    Db: { adjustments: ["Bb", "Eb", "Ab", "Db", "Gb"] },
    "C#": { adjustments: ["Bb", "Eb", "Ab", "Db", "Gb"] },
    Gb: { adjustments: ["Bb", "Eb", "Ab", "Db", "Gb", "Cb"] },
    "F#": { adjustments: ["Bb", "Eb", "Ab", "Db", "Gb", "Cb"] },
  };

  const adjustments = keySignaturesAndAdjustments[keySignature].adjustments;
  const accidental = adjustments[0]?.slice(-1) || "";
  const baseNotesToAdjust = adjustments.map((adjustments) =>
    adjustments.slice(0, -1)
  );

  return notes.map((note) => {
    const baseNote = note.slice(0, -1);
    const accidentalOfNote = note.match(/[#bn]/)?.[0];

    if (accidentalOfNote) {
      return accidentalOfNote === "n"
        ? ((baseNote + note.slice(-1)) as Note)
        : note;
    }

    if (baseNotesToAdjust.includes(baseNote)) {
      const adjustedNote = baseNote + accidental + note.slice(-1);
      return adjustedNote as Note;
    }
    return note;
  });
}

export function detectScalesForNotes(notes: Note[]): string[] {
  const pitchClassesOfNotes = Array.from(
    new Set(notes.map((note) => NoteUtil.get(note).pc))
  );

  console.log(pitchClassesOfNotes);

  return [];
}

export function getNoteFromScaleDegreesDistanceFromReferenceNote(
  referenceNote: string,
  scaleDegreesDistance: number,
  scaleName: string
): string | undefined {
  const scale = ScaleUtil.get(scaleName);
  const scaleNotes = scale.notes;

  const referencePitchClass = NoteUtil.get(referenceNote).pc;
  const referenceOctave = NoteUtil.get(referenceNote).oct;

  const referenceIndex = scaleNotes.findIndex(
    (note) => NoteUtil.get(note).pc === referencePitchClass
  );

  if (referenceOctave === undefined || referenceIndex === -1) {
    return undefined;
  }

  const targetIndex = referenceIndex + scaleDegreesDistance;

  const octaveAdjustment = Math.floor(targetIndex / scaleNotes.length);
  const normalizedIndex =
    ((targetIndex % scaleNotes.length) + scaleNotes.length) % scaleNotes.length;

  const targetPitchClass = scaleNotes[normalizedIndex];
  const targetOctave = referenceOctave + octaveAdjustment;

  return `${targetPitchClass}${targetOctave}`;
}

export function getDifferenceInPitchClasses(
  pitchClass1: string,
  pitchClass2: string
): string | null {
  const interval = IntervalUtil.distance(pitchClass1, pitchClass2);
  const reverseInterval = IntervalUtil.distance(pitchClass2, pitchClass1);

  if (!interval || !reverseInterval) {
    return null;
  }

  const shortestNoteDistance = Math.min(
    IntervalUtil.num(interval),
    IntervalUtil.num(reverseInterval)
  );

  return IntervalUtil.num(interval) === shortestNoteDistance
    ? interval
    : `-${reverseInterval}`;
}
