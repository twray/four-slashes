import {
  Chord as ChordUtil,
  Interval as IntervalUtil,
  Note as NoteUtil,
  VoiceLeading,
  Voicing,
} from "tonal";
import {
  Note,
  PitchClass,
  getDifferenceInPitchClasses,
  isPianoNote,
} from "./music";

import chordVoicingDictionary from "../data/chordVoicings.json";

type ChordQualityAndAlterationShortForm =
  | ""
  | "M"
  | "m"
  | "o"
  | "aug"
  | "m7"
  | "7"
  | "maj7"
  | "^7"
  | "m9"
  | "9"
  | "maj9"
  | "^9"
  | "69"
  | "m7b5"
  | "7b9"
  | "7b13"
  | "o7"
  | "7#11"
  | "7#9"
  | "mM7"
  | "m9b5"
  | "9b9"
  | "9b13"
  | "o9"
  | "9#11"
  | "9#9"
  | "mM9"
  | "m6";

export type Chord = `
  ${PitchClass}
  ${ChordQualityAndAlterationShortForm}${"/" | ""}
  ${PitchClass | ""}
`;

export function isChord(value: string): value is Chord {
  const regex =
    /^[A-G][#b]?(M|m|o|aug|m7|7|maj7|\^7|m9|9|maj9|\^9|69|m7b5|7b9|7b13|o7|7#11|7#9|mM7|m9b5|9b9|9b13|o9|9#11|9#9|mM9|m6)?(\/[A-G][#b]?)?$/;
  return regex.test(value);
}

export function generateArrangementAsNotationForChords(
  chords: Chord[]
): string {
  chords.forEach((chord) => {
    if (!isChord(chord)) {
      console.warn(`Chord "${chord}" is not a supported chord.`);
    }
  });

  const chordsValidated = chords.filter((chord) => isChord(chord));

  let previousVoicing: Note[];

  const chordVoicings: {
    chord: Chord;
    voicing: Note[];
    bassNote?: PitchClass;
    leadingNotes: Note[];
    minOctaveInVoicing: number;
    maxOctaveInVoicing: number;
  }[] = [];

  chordsValidated.forEach((chord) => {
    const currentVoicing: Note[] = Voicing.get(
      chord,
      undefined,
      chordVoicingDictionary,
      VoiceLeading.topNoteDiff,
      previousVoicing
    ).filter((note) => isPianoNote(note));

    const { bass, root, tonic } = ChordUtil.get(chord);

    const bassNote = (bass || root || tonic || undefined) as
      | PitchClass
      | undefined;

    const minOctaveInVoicing = Math.min(
      ...currentVoicing
        .map((note) => NoteUtil.get(note).oct)
        .filter((octaveNumberInVoicing) => octaveNumberInVoicing !== undefined)
    );

    const maxOctaveInVoicing = Math.max(
      ...currentVoicing
        .map((note) => NoteUtil.get(note).oct)
        .filter((octaveNumberInVoicing) => octaveNumberInVoicing !== undefined)
    );

    const bassVoicingAsStrings = bassNote
      ? [
          `${bassNote}${minOctaveInVoicing - 1}`,
          `${bassNote}${minOctaveInVoicing}`,
        ]
      : [];

    const bassVoicing: Note[] = bassVoicingAsStrings.every((note) =>
      isPianoNote(note)
    )
      ? bassVoicingAsStrings
      : [];

    const voicing = [...bassVoicing, ...currentVoicing];
    const leadingNotes = previousVoicing
      ? currentVoicing.filter((note) => previousVoicing.includes(note))
      : [];

    chordVoicings.push({
      chord,
      voicing,
      bassNote,
      leadingNotes,
      minOctaveInVoicing,
      maxOctaveInVoicing,
    });
    previousVoicing = currentVoicing;
  });

  const chordsAsNotation = chordVoicings
    .map(
      (
        { chord, voicing, bassNote, minOctaveInVoicing, maxOctaveInVoicing },
        index
      ) => {
        const leadingNotesOfNextChord =
          index < chordVoicings.length - 1
            ? chordVoicings[index + 1].leadingNotes
            : [];

        const currentChordHas7th = ChordUtil.get(chord).intervals.some(
          (interval) => interval.includes("7")
        );

        const nextChordHas7th =
          index < chordVoicings.length - 1 &&
          ChordUtil.get(chordVoicings[index + 1].chord).intervals.some(
            (interval) => interval.includes("7")
          );

        const groupedNotesForBarAsStrings = [`${voicing.join("_")}:2`];

        // Add the base note played as an octave in the higher registers if the
        // current chord does not contain a 7th

        if (
          !currentChordHas7th &&
          bassNote &&
          index < chordVoicings.length - 1
        ) {
          const upperOctaveAsStrings = [
            `${bassNote}${maxOctaveInVoicing + 1}`,
            `${bassNote}${maxOctaveInVoicing + 2}`,
          ];

          if (upperOctaveAsStrings.every((note) => isPianoNote(note))) {
            groupedNotesForBarAsStrings.push(
              `${upperOctaveAsStrings.join("_")}:4`
            );
          }
        }

        // If the next chord does not contain a 7th, add the leading notes
        // (if any). Otherwise if the next chord contains a 7th, add an
        // enclosure that wraps to its tonic.

        // - At later stages, try experimenting with the directionality
        //   of the enclosure
        // - Sense if the tonids of the chords are ascending or descending:
        //   in such cases, create runs instead of enclosures, based on
        //   direction

        if (!nextChordHas7th && leadingNotesOfNextChord.length > 0) {
          groupedNotesForBarAsStrings.push(
            `${leadingNotesOfNextChord.join("_")}:4`
          );
        } else if (nextChordHas7th && index < chordVoicings.length - 1) {
          const nextChord = chordVoicings[index + 1].chord;

          const { tonic } = ChordUtil.get(chord);
          const { tonic: nextChordTonic, intervals: nextChordIntervals } =
            ChordUtil.get(nextChord);

          const nextChord7thInterval = nextChordIntervals.find(
            (interval) => IntervalUtil.num(interval) === 7
          );

          const nextChord3rdInterval = nextChordIntervals.find(
            (interval) => IntervalUtil.num(interval) === 3
          );

          if (
            tonic &&
            nextChordTonic &&
            nextChord3rdInterval &&
            nextChord7thInterval
          ) {
            // Determine if the tonic of the following chord is one step below
            // or above the tonic of the current chord. If that's the case,
            // then create approach tones to that tonic. If that is not the
            // case, then create an enclosure instead.

            const targetPitchClass = nextChordTonic;

            const differenceInTonicOfThisChordAndFollowingChord =
              getDifferenceInPitchClasses(tonic, nextChordTonic);

            let leadingToneIntervals: string[] = [];

            if (
              differenceInTonicOfThisChordAndFollowingChord &&
              Math.abs(
                IntervalUtil.num(differenceInTonicOfThisChordAndFollowingChord)
              ) === 2
            ) {
              const directionInTonicOfThisChordAndFollowingChord =
                IntervalUtil.get(
                  differenceInTonicOfThisChordAndFollowingChord
                ).dir;

              if (directionInTonicOfThisChordAndFollowingChord === 1) {
                leadingToneIntervals = [`-3M`, `-2M`];
              } else if (directionInTonicOfThisChordAndFollowingChord === -1) {
                leadingToneIntervals = ["3M", `2M`];
              }
            } else {
              leadingToneIntervals = [
                "2M",
                `-${IntervalUtil.invert(nextChord7thInterval)}`,
              ];
            }

            const targetNote =
              `${targetPitchClass}${minOctaveInVoicing}` as Note;

            const leadingTones = leadingToneIntervals.map((interval) =>
              NoteUtil.transpose(targetNote, interval)
            ) as Note[];

            if (leadingTones.every((note) => isPianoNote(note))) {
              groupedNotesForBarAsStrings.push(
                leadingTones.map((note) => `${note}:8`).join(" ")
              );
            }
          }
        }

        return groupedNotesForBarAsStrings.join(" ").trim();
      }
    )
    .join(" | ");

  return chordsAsNotation;
}
