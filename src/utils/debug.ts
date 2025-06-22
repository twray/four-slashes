import { SequencedActionGroup } from "../hooks/useSequencer";

export function logSequencedActions(
  sequencedActionGroups: SequencedActionGroup[]
) {
  console.log(
    `\n${sequencedActionGroups
      .map(
        ({ sequenceNumber, startTimeInSequenceInMs, actions, barIndex }) =>
          `[${(sequenceNumber !== undefined
            ? sequenceNumber.toString()
            : "_"
          ).padStart(2, " ")} B${barIndex} T: ${startTimeInSequenceInMs
            .toString()
            .padStart(4, " ")} (${actions
            .map((action) =>
              action.type === "note"
                ? `${action.note.pitch}:${action.note.duration}${
                    action.note.dotted ? "." : ""
                  }`
                : action.type
            )
            .join(", ")})]`
      )
      .join("\n")}`
  );
}
