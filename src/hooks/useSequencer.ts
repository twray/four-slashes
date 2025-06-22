import { useEffect, useRef, useState } from "react";
import {
  type KeySignature,
  type NoteDuration,
  type NoteWithDuration,
  type RestWithDuration,
  type TimeSignature,
  adjustNotesToKeySignature,
  getBarLengthInMsForTimeSignature,
  getTotalNoteOrRestDurationInMs,
  isKeySignature,
  isNote,
  isRelativeNote,
  isTimeSignature,
  relativeNoteToAbsoluteNote,
} from "../utils/music";

export type Bar = {
  withSustainPedal?: boolean;
  partialLength?: boolean;
  actionGroups: ActionGroup[];
};

type BaseSequencerAction = {
  type: string;
};

type PedalAction = {
  type: "sustainPedalUp" | "sustainPedalDown";
} & BaseSequencerAction;

type NoteAction = {
  type: "note";
  note: NoteWithDuration;
} & BaseSequencerAction;

type RestAction = {
  type: "rest";
  rest: RestWithDuration;
} & BaseSequencerAction;

type SetBPMAction = {
  type: "setBPM";
  bpm: number;
};

type AutoSustainPedalAction = {
  type: "autoSustainPedal";
  pedalOnEveryBar: boolean;
} & BaseSequencerAction;

type SetTimeSignatureAction = {
  type: "setTimeSignature";
  timeSignature: TimeSignature;
} & BaseSequencerAction;

type SetKeySignatureAction = {
  type: "setKeySignature";
  keySignature: KeySignature;
} & BaseSequencerAction;

export type SequencerAction =
  | PedalAction
  | NoteAction
  | RestAction
  | SetBPMAction
  | AutoSustainPedalAction
  | SetTimeSignatureAction
  | SetKeySignatureAction;

type NoteActionGroup = {
  actions: NoteAction[];
  startPositionInBar?: number;
};

type RestActionGroup = {
  actions: [RestAction];
};

type SustainPedalActionGroup = {
  actions: [PedalAction];
};

type ControlActionGroup = {
  actions: (
    | SetBPMAction
    | AutoSustainPedalAction
    | SetTimeSignatureAction
    | SetKeySignatureAction
  )[];
};

type ActionGroup =
  | NoteActionGroup
  | RestActionGroup
  | SustainPedalActionGroup
  | ControlActionGroup;

export type SequencedActionGroup = {
  sequenceNumber?: number;
  barIndex: number;
  startTimeInSequenceInMs: number;
  durationInMs?: number;
} & ActionGroup;

type BaseSequencerEvent = {
  type: string;
};

export type SequencerControlEvent = {
  type: "sequenceStart" | "sequenceEnd";
} & BaseSequencerEvent;

export type SequencerBarEvent = {
  type: "barStart" | "barEnd";
  barIndex: number;
} & BaseSequencerEvent;

type NoteSequencerEvent = {
  type: "noteStart" | "noteEnd";
  action: NoteAction;
} & BaseSequencerEvent;

type RestSequencerEvent = {
  type: "restStart" | "restEnd";
  action: RestAction;
} & BaseSequencerEvent;

type SustainPedalSequencerEvent = {
  type: "sustainPedalUp" | "sustainPedalDown";
} & BaseSequencerEvent;

type SequencerEvent =
  | SequencerControlEvent
  | SequencerBarEvent
  | NoteSequencerEvent
  | RestSequencerEvent
  | SustainPedalSequencerEvent;

export type SequencerController = {
  playSequence: () => void;
  pauseSequence: () => void;
  stopSequence: () => void;
};

type UseSequencerReturn = {
  initSequence: (
    bars: Bar[],
    onEvent?: (event: SequencerEvent) => void
  ) => void;
  generateSequenceFromNotation: (notation: string) => Bar[];
  initSequenceWithNotation: (
    notation: string,
    onEvent?: (event: SequencerEvent) => void
  ) => void;
  isPlaying: boolean;
} & SequencerController;

function isNoteActionGroup(
  actionGroup: ActionGroup
): actionGroup is NoteActionGroup {
  return (
    actionGroup.actions.length > 0 &&
    actionGroup.actions.every((action) => action.type === "note")
  );
}

function isRestActionGroup(
  actionGroup: ActionGroup
): actionGroup is RestActionGroup {
  return (
    actionGroup.actions.length === 1 && actionGroup.actions[0].type === "rest"
  );
}

function isSustainPedalActionGroup(
  actionGroup: ActionGroup
): actionGroup is SustainPedalActionGroup {
  return (
    actionGroup.actions.length === 1 &&
    (actionGroup.actions[0].type === "sustainPedalUp" ||
      actionGroup.actions[0].type === "sustainPedalDown")
  );
}

function isSequencableActionGroup(
  actionGroup: ActionGroup
): actionGroup is NoteActionGroup | RestActionGroup {
  return (
    isNoteActionGroup(actionGroup) ||
    isRestActionGroup(actionGroup) ||
    isSustainPedalActionGroup(actionGroup)
  );
}

function hasTiedNotes(
  currentActionGroup: NoteActionGroup,
  nextActionGroup: NoteActionGroup
): boolean {
  const tiedNote = currentActionGroup.actions.find(
    (action) => action.note.tied
  );

  if (!tiedNote) return false;

  return nextActionGroup.actions.some(
    (action) => action.note.pitch === tiedNote.note.pitch
  );
}

function getBarStartTimeInSequenceForNonLinearlySequencedActionGroupInBar(
  bpm: number,
  noteActionGroup: NoteActionGroup
) {
  const { startPositionInBar } = noteActionGroup;

  if (startPositionInBar === undefined) return undefined;

  const quarterNoteDurationInMs = (60 / bpm) * 1000;
  return quarterNoteDurationInMs * (startPositionInBar - 1);
}

export function useSequencer(): UseSequencerReturn {
  const [isPlaying, setIsPlaying] = useState(false);

  const sequenceFrameRate = 10;
  const sequenceFrameLength = 1000 / sequenceFrameRate;

  const sequencerHasBeenInitializedRef = useRef(false);
  const sequencedActionGroupsRef = useRef<SequencedActionGroup[]>([]);

  const currentSequenceTimeRef = useRef(0);
  const currentSequenceBarIndexRef = useRef<number | null>(null);
  const totalSequenceTimeRef = useRef(0);
  const sequenceIsPlayingRef = useRef(false);

  const bpmRef = useRef(120);
  const keySignatureRef = useRef<KeySignature>("C");

  const sequenceFrameTimeoutRef = useRef<number | null>(null);

  const onEventRef = useRef<(event: SequencerEvent) => void | null>(null);

  function initSequence(
    bars: Bar[],
    onEvent?: (event: SequencerEvent) => void
  ) {
    const sequencedActionGroups: SequencedActionGroup[] = [];
    const timePeriodInWhichSustainPedalGoesUpBeforeNextBarInMs = 100;

    // BPM and time signature are used locally here to compute the bar length
    // when the bars are parsed -- otherwise BPM is also stored as a ref
    // as this can change over time.

    let bpm = bpmRef.current;
    let timeSignature: TimeSignature = "4/4";

    let pedalOnEveryBar = false;
    let currentBarStartTimeInSequence = 0;

    let autoSustainPedalAction: AutoSustainPedalAction | undefined;
    let lastSequencableActionGroupInPreviousBarHasTiedNote = false;

    bars.forEach((bar, barIndex) => {
      // bpm and time signature must be set before the bar length is calculated,
      // therefore these action groups will be applied first.

      bar.actionGroups.forEach(({ actions }) => {
        if (!autoSustainPedalAction) {
          autoSustainPedalAction = actions.find(
            (action) => action.type === "autoSustainPedal"
          );
        }

        actions.forEach((action) => {
          switch (action.type) {
            case "setTimeSignature":
              timeSignature = action.timeSignature;
              break;
            case "setBPM":
              bpm = action.bpm;
              break;
            default:
          }
        });
      });

      const nominalBarLengthInMs = getBarLengthInMsForTimeSignature(
        bpm,
        timeSignature
      );

      bar.actionGroups = bar.actionGroups.filter((actionGroup) => {
        if (
          isNoteActionGroup(actionGroup) &&
          actionGroup.startPositionInBar !== undefined &&
          actionGroup.startPositionInBar < 1
        ) {
          console.warn(
            `Invalid startPositionInBar ${
              actionGroup.startPositionInBar
            } for action group in bar ${
              barIndex + 1
            }. Bar start positions are dictated in quarter-note lengths for ` +
              `that bar, starting with 1 as the first position.`
          );

          return false;
        }

        return true;
      });

      const totalLengthOfLinearlySequencedNotesInBar = bar.actionGroups
        .filter(
          (actionGroup): actionGroup is NoteActionGroup =>
            !(
              isNoteActionGroup(actionGroup) &&
              actionGroup.startPositionInBar !== undefined
            )
        )
        .reduce(
          (total, actionGroup) =>
            total + getLengthOfLongestActionInMs(bpm, actionGroup.actions),
          0
        );

      const latestNonLinearlySequencedNoteActionGroupInBar = bar.actionGroups
        .filter(
          (actionGroup): actionGroup is NoteActionGroup =>
            isNoteActionGroup(actionGroup) &&
            actionGroup.startPositionInBar !== undefined
        )
        .toSorted(
          (actionGroupA, actionGroupB) =>
            (actionGroupA.startPositionInBar ?? 0) -
            (actionGroupB.startPositionInBar ?? 0)
        )
        .findLast(
          (actionGroup) => actionGroup.startPositionInBar !== undefined
        );

      const noteEndTimeOfLatestNonLinearlySequencedNoteInBar =
        latestNonLinearlySequencedNoteActionGroupInBar
          ? (getBarStartTimeInSequenceForNonLinearlySequencedActionGroupInBar(
              bpm,
              latestNonLinearlySequencedNoteActionGroupInBar
            ) ?? 0) +
            getLengthOfLongestActionInMs(
              bpm,
              latestNonLinearlySequencedNoteActionGroupInBar.actions
            )
          : 0;

      const totalLengthOfNotesInBar = Math.max(
        totalLengthOfLinearlySequencedNotesInBar,
        noteEndTimeOfLatestNonLinearlySequencedNoteInBar
      );

      if (totalLengthOfNotesInBar > nominalBarLengthInMs) {
        console.warn(
          "The total length of notes in the bar exceeds the bar length."
        );
      }

      const totalBarLengthInMs = bar.partialLength
        ? totalLengthOfNotesInBar
        : Math.max(nominalBarLengthInMs, totalLengthOfNotesInBar);

      const nonSequencableActionGroupsInBar = bar.actionGroups
        .filter((actionGroup) => !isSequencableActionGroup(actionGroup))
        .map((actionGroup) => ({
          barIndex,
          startTimeInSequenceInMs: currentBarStartTimeInSequence,
          ...actionGroup,
        }));

      let currentItemInBarStartTimeInSequence = 0;

      const sequencableActionGroupsInBar = bar.actionGroups
        .filter((actionGroup) => isSequencableActionGroup(actionGroup))
        .map((actionGroup) => {
          const durationInMs = getLengthOfLongestActionInMs(
            bpm,
            actionGroup.actions
          );

          let startTimeInSequenceInMs;

          if (
            isNoteActionGroup(actionGroup) &&
            actionGroup.startPositionInBar !== undefined
          ) {
            startTimeInSequenceInMs =
              currentBarStartTimeInSequence +
              (getBarStartTimeInSequenceForNonLinearlySequencedActionGroupInBar(
                bpm,
                actionGroup
              ) || 0);
          } else {
            startTimeInSequenceInMs =
              currentBarStartTimeInSequence +
              currentItemInBarStartTimeInSequence;

            currentItemInBarStartTimeInSequence += durationInMs;
          }

          const actionGroupWithStartTimeInSequence = {
            barIndex,
            startTimeInSequenceInMs,
            durationInMs,
            ...actionGroup,
          };

          return actionGroupWithStartTimeInSequence;
        });

      if (autoSustainPedalAction) {
        pedalOnEveryBar = autoSustainPedalAction.pedalOnEveryBar;
      }

      if (bar.withSustainPedal || pedalOnEveryBar) {
        const sustainPedalDownAction: SequencedActionGroup = {
          barIndex,
          startTimeInSequenceInMs: currentBarStartTimeInSequence,
          actions: [{ type: "sustainPedalDown" }],
        };

        const sustainPedalUpAction: SequencedActionGroup = {
          barIndex,
          startTimeInSequenceInMs:
            currentBarStartTimeInSequence +
            totalBarLengthInMs -
            timePeriodInWhichSustainPedalGoesUpBeforeNextBarInMs,
          actions: [{ type: "sustainPedalUp" }],
        };

        const firstSequencableActionGroupInNextBar =
          barIndex + 1 < bars.length
            ? bars[barIndex + 1].actionGroups.find((actionGroup) =>
                isSequencableActionGroup(actionGroup)
              )
            : null;

        const lastSequencableActionGroupInThisBar =
          sequencableActionGroupsInBar[sequencableActionGroupsInBar.length - 1];

        const lastSequencableActionGroupInThisBarHasTiedNote = !!(
          firstSequencableActionGroupInNextBar &&
          isNoteActionGroup(firstSequencableActionGroupInNextBar) &&
          lastSequencableActionGroupInThisBar &&
          isNoteActionGroup(lastSequencableActionGroupInThisBar) &&
          hasTiedNotes(
            lastSequencableActionGroupInThisBar,
            firstSequencableActionGroupInNextBar
          )
        );

        sequencedActionGroups.push(
          ...nonSequencableActionGroupsInBar,
          ...(!lastSequencableActionGroupInPreviousBarHasTiedNote
            ? [sustainPedalDownAction]
            : []),
          ...sequencableActionGroupsInBar,
          ...(!lastSequencableActionGroupInThisBarHasTiedNote
            ? [sustainPedalUpAction]
            : [])
        );

        lastSequencableActionGroupInPreviousBarHasTiedNote =
          lastSequencableActionGroupInThisBarHasTiedNote;
      } else {
        sequencedActionGroups.push(
          ...nonSequencableActionGroupsInBar,
          ...sequencableActionGroupsInBar
        );
      }

      currentBarStartTimeInSequence += totalBarLengthInMs;
    });

    const sortedSequencedActionGroups = sequencedActionGroups
      .toSorted((a, b) => a.startTimeInSequenceInMs - b.startTimeInSequenceInMs)
      .map((sequencedActionGroup, sequenceNumber) => ({
        sequenceNumber,
        ...sequencedActionGroup,
      }));

    const lastSequencedActionGroup =
      sortedSequencedActionGroups[sortedSequencedActionGroups.length - 1];

    totalSequenceTimeRef.current = Math.max(
      currentBarStartTimeInSequence,
      lastSequencedActionGroup.durationInMs
        ? lastSequencedActionGroup.startTimeInSequenceInMs +
            lastSequencedActionGroup.durationInMs
        : lastSequencedActionGroup.startTimeInSequenceInMs
    );

    sequencedActionGroupsRef.current = sortedSequencedActionGroups;
    onEventRef.current = onEvent || null;
    sequencerHasBeenInitializedRef.current = true;
  }

  function initSequenceWithNotation(
    notation: string,
    onEvent?: (event: SequencerEvent) => void
  ) {
    initSequence(generateSequenceFromNotation(notation), onEvent);
  }

  function generateSequenceFromNotation(notation: string) {
    let currentSetDuration: NoteDuration = 4;

    const barsForSequence = notation
      .split("|")
      .filter((notationElement) => notationElement.trim() !== "")
      .map((barAsNotation) => {
        const actionGroupsForBar: ActionGroup[] = [];

        let partialLength = false;

        barAsNotation
          .trim()
          .split(" ")
          .filter((notationElement) => notationElement.trim() !== "")
          .forEach((notationElementGroupInBarUntrimmed) => {
            const notationElementGroupInBar =
              notationElementGroupInBarUntrimmed.trim();

            if (notationElementGroupInBar.includes("=")) {
              const [command, value] = notationElementGroupInBar.split("=");

              if (!command || !value) return;

              switch (command) {
                case "bpm": {
                  if (!isNaN(+value) && +value > 0) {
                    actionGroupsForBar.push({
                      actions: [
                        {
                          type: "setBPM",
                          bpm: parseInt(value, 10),
                        },
                      ],
                    });
                  }
                  return;
                }
                case "time": {
                  if (isTimeSignature(value)) {
                    actionGroupsForBar.push({
                      actions: [
                        {
                          type: "setTimeSignature",
                          timeSignature: value,
                        },
                      ],
                    });
                  }
                  return;
                }
                case "key": {
                  if (isKeySignature(value)) {
                    actionGroupsForBar.push({
                      actions: [
                        {
                          type: "setKeySignature",
                          keySignature: value,
                        },
                      ],
                    });
                  }
                  return;
                }
                case "autoSustain": {
                  if (["on", "off"].includes(value)) {
                    actionGroupsForBar.push({
                      actions: [
                        {
                          type: "autoSustainPedal",
                          pedalOnEveryBar: value === "on",
                        },
                      ],
                    });
                  }
                  return;
                }
                default:
                  return;
              }
            }

            switch (notationElementGroupInBar) {
              case "[_": {
                actionGroupsForBar.push({
                  actions: [
                    {
                      type: "sustainPedalDown",
                    },
                  ],
                });
                return;
              }
              case "_]": {
                actionGroupsForBar.push({
                  actions: [
                    {
                      type: "sustainPedalUp",
                    },
                  ],
                });
                return;
              }
              case ">": {
                partialLength = true;
                return;
              }
            }

            const patterns = {
              toTestTheExistenceOf: {
                noteDuration: /:(1|2|4|8|16|32|64).?/,
                startPositionInBar: /@([1-9]\d*(\.\d+)?|1\.0|1\.\d+)$/,
                groupOfNotes:
                  /^(([A-G][#bn]?[0-8]|([A-G][#bn]?[-+]?[1-4]?))[.~]?)(_(([A-G][#bn]?[0-8]|([A-G][#bn]?[-+]?[1-4]?))[.~]?))*$/,
                rest: /^(##\.?)$/,
              },
              toGetTheValueOf: {
                noteDuration: /(1|2|4|8|16|32|64).?$/,
                noteDurationValue: /(1|2|4|8|16|32|64)/,
                startPositionInBar: /([1-9]\d*(\.\d+)?|1\.0|1\.\d+)/,
                timeBasedSequencableElement:
                  /^(((([A-G][#bn]?[0-8]|([A-G][#bn]?[-+]?[1-4]?))[.~]?)(_(([A-G][#bn]?[0-8]|([A-G][#bn]?[-+]?[1-4]?))[.~]?))*)|##\.?)/,
                note: /(([A-G][#bn]?[0-8]|([A-G][#bn]?[-+]?[1-4]?)))/,
              },
            };

            let currentDurationForNote: NoteDuration | undefined;
            let dotted = false;

            const timeBasedSequencableElement = notationElementGroupInBar.match(
              patterns.toGetTheValueOf.timeBasedSequencableElement
            )?.[0];

            const duration = notationElementGroupInBar
              .match(patterns.toTestTheExistenceOf.noteDuration)?.[0]
              .match(patterns.toGetTheValueOf.noteDuration)?.[0];

            const durationValue =
              duration !== undefined &&
              duration.match(patterns.toGetTheValueOf.noteDurationValue)?.[0];

            const startPositionInBarAsExtracted = notationElementGroupInBar
              .match(patterns.toTestTheExistenceOf.startPositionInBar)?.[0]
              .match(patterns.toGetTheValueOf.startPositionInBar)?.[0];

            const startPositionInBar =
              startPositionInBarAsExtracted !== undefined
                ? +startPositionInBarAsExtracted
                : undefined;

            if (durationValue) {
              if (timeBasedSequencableElement) {
                currentDurationForNote = +durationValue as NoteDuration;
              } else {
                currentSetDuration = +durationValue as NoteDuration;
              }
            }

            if (duration?.endsWith(".")) {
              dotted = true;
            }

            if (timeBasedSequencableElement) {
              if (
                timeBasedSequencableElement.match(
                  patterns.toTestTheExistenceOf.rest
                )
              ) {
                actionGroupsForBar.push({
                  startPositionInBar,
                  actions: [
                    {
                      type: "rest",
                      rest: {
                        duration: currentDurationForNote || currentSetDuration,
                        dotted,
                      },
                    },
                  ],
                });
              } else if (
                timeBasedSequencableElement.match(
                  patterns.toTestTheExistenceOf.groupOfNotes
                )
              ) {
                const noteActions: NoteAction[] = [];
                const noteEntities = timeBasedSequencableElement.split("_");

                noteEntities.forEach((noteEntity) => {
                  const tied = noteEntity.includes("~");

                  const pitch = noteEntity.match(
                    patterns.toGetTheValueOf.note
                  )?.[0];

                  const absolutePitch = pitch
                    ? isRelativeNote(pitch)
                      ? relativeNoteToAbsoluteNote(pitch)
                      : pitch
                    : undefined;

                  if (absolutePitch && isNote(absolutePitch)) {
                    noteActions.push({
                      type: "note",
                      note: {
                        pitch: absolutePitch,
                        duration: currentDurationForNote || currentSetDuration,
                        dotted,
                        tied,
                      },
                    });
                  }
                });

                actionGroupsForBar.push({
                  startPositionInBar,
                  actions: noteActions,
                });
              }
            }
          });

        return { partialLength, actionGroups: actionGroupsForBar };
      });

    // For any bars that contain actions that are not sequencable,
    // such actions should be moved into the bar that follows them.

    const barsForSequenceWithNonSequencableActionGroupsMerged = barsForSequence
      .map((bar, barIndex) => {
        if (barIndex > 0) {
          const previousBar = barsForSequence[barIndex - 1];

          if (
            previousBar.actionGroups.every(
              (actionGroup) => !isSequencableActionGroup(actionGroup)
            )
          ) {
            return {
              ...bar,
              actionGroups: [...previousBar.actionGroups, ...bar.actionGroups],
            };
          } else {
            return bar;
          }
        } else {
          return bar;
        }
      })
      .map((bar) =>
        bar.actionGroups.every(
          (actionGroup) => !isSequencableActionGroup(actionGroup)
        )
          ? { ...bar, actionGroups: [] }
          : bar
      )
      .filter((bar) => bar.actionGroups.length > 0);

    return barsForSequenceWithNonSequencableActionGroupsMerged;
  }

  function getLengthOfLongestActionInMs(
    bpm: number,
    actions: SequencerAction[]
  ) {
    const actionsWithDurationsInMs = actions.map((action) => {
      if (action.type === "note") {
        return getTotalNoteOrRestDurationInMs(bpm, action.note);
      }
      if (action.type === "rest") {
        return getTotalNoteOrRestDurationInMs(bpm, action.rest);
      }
      return 0;
    });

    return Math.max(...actionsWithDurationsInMs);
  }

  function playAction(action: SequencerAction, sequenceNumber: number) {
    if (!sequencerHasBeenInitializedRef.current) return;

    const onEvent = onEventRef.current;
    const sequencableActionGroups = sequencedActionGroupsRef.current;
    const bpm = bpmRef.current;
    const keySignature = keySignatureRef.current;

    const currentIndex = sequencableActionGroups.findIndex(
      (actionGroup) => actionGroup.sequenceNumber === sequenceNumber
    );

    switch (action.type) {
      case "note": {
        // Modify the note's pitch to match the key signature
        action.note.pitch = adjustNotesToKeySignature(keySignature, [
          action.note.pitch,
        ])[0];

        // Look at the previous action group to see if this note is tied
        // to a note in that group

        if (
          currentIndex > 0 &&
          sequencableActionGroups
            .slice(0, currentIndex)
            .findLast((actionGroup) => isNoteActionGroup(actionGroup))
            ?.actions.some(
              (prevAction) =>
                prevAction.type === "note" &&
                prevAction.note.tied &&
                prevAction.note.pitch === action.note.pitch
            )
        ) {
          return;
        }

        if (onEvent) {
          onEvent({
            type: "noteStart",
            action: action,
          });
        }

        let noteDurationInMs;

        // Look ahead to the next action group to see if the note is tied,
        // compute it duration accordingly

        if (action.note.tied) {
          const nextNoteActionGroup = sequencableActionGroups
            .slice(currentIndex)
            .find((actionGroup) => isNoteActionGroup(actionGroup));

          if (nextNoteActionGroup) {
            const nextNoteActionWithSamePitch = sequencableActionGroups
              .slice(currentIndex)
              .find((actionGroup) => actionGroup.actions[0]?.type === "note")
              ?.actions.find(
                (nextNoteAction) =>
                  nextNoteAction.type === "note" &&
                  nextNoteAction.note.pitch === action.note.pitch
              ) as NoteAction;

            if (nextNoteActionWithSamePitch) {
              noteDurationInMs = getTotalNoteOrRestDurationInMs(
                bpm,
                action.note,
                nextNoteActionWithSamePitch.note
              );
            }
          }
        } else {
          noteDurationInMs = getTotalNoteOrRestDurationInMs(bpm, action.note);
        }

        setTimeout(() => {
          if (onEvent) {
            onEvent({
              type: "noteEnd",
              action: action,
            });
          }
        }, noteDurationInMs);
        break;
      }
      case "rest": {
        if (onEvent) {
          onEvent({
            type: "restStart",
            action: action,
          });
        }

        const restDurationInMs = getTotalNoteOrRestDurationInMs(
          bpm,
          action.rest
        );

        setTimeout(() => {
          if (onEvent) {
            onEvent({
              type: "restEnd",
              action: action,
            });
          }
        }, restDurationInMs);
        break;
      }
      case "sustainPedalUp":
      case "sustainPedalDown": {
        if (onEvent) {
          onEvent({
            type: action.type,
          });
        }
        break;
      }
      case "setBPM": {
        bpmRef.current = action.bpm;
        break;
      }
      case "setKeySignature": {
        keySignatureRef.current = action.keySignature;
        break;
      }
      default:
        break;
    }
  }

  function sequenceLoop() {
    const sequenceIsPlaying = sequenceIsPlayingRef.current;
    const sequencedActionGroups = sequencedActionGroupsRef.current;
    const currentSequenceTime = currentSequenceTimeRef.current;
    const totalSequenceTime = totalSequenceTimeRef.current;
    const onEvent = onEventRef.current;

    const sequencedActionGroupsForFrame = sequencedActionGroups.filter(
      ({ startTimeInSequenceInMs }) =>
        startTimeInSequenceInMs >= currentSequenceTimeRef.current &&
        startTimeInSequenceInMs <
          currentSequenceTimeRef.current + sequenceFrameLength
    );

    if (sequencedActionGroupsForFrame.length > 0) {
      sequencedActionGroupsForFrame.forEach(
        ({ actions, sequenceNumber, startTimeInSequenceInMs, barIndex }) => {
          if (
            !currentSequenceBarIndexRef.current ||
            barIndex > currentSequenceBarIndexRef.current
          ) {
            if (onEvent) {
              onEvent({
                type: "barStart",
                barIndex,
              });
            }
          }

          currentSequenceBarIndexRef.current = barIndex;
          setTimeout(() => {
            actions.forEach((action) => {
              if (sequenceNumber !== undefined) {
                playAction(action, sequenceNumber);
              }
            });
          }, startTimeInSequenceInMs - currentSequenceTime);
        }
      );
    }

    if (sequenceIsPlaying && currentSequenceTime < totalSequenceTime) {
      sequenceFrameTimeoutRef.current = setTimeout(() => {
        currentSequenceTimeRef.current += sequenceFrameLength;
        sequenceLoop();
      }, sequenceFrameLength);
    }

    if (currentSequenceTime >= totalSequenceTime) {
      stopSequence();
    }
  }

  function playSequence() {
    const currentSequenceTime = currentSequenceTimeRef.current;
    const sequencerHasBeenInitialized = sequencerHasBeenInitializedRef.current;
    const sequencedActionGroups = sequencedActionGroupsRef.current;
    const onEvent = onEventRef.current;

    if (
      !sequencerHasBeenInitialized ||
      isPlaying ||
      sequencedActionGroups.length === 0
    ) {
      return;
    }

    sequenceIsPlayingRef.current = true;
    setIsPlaying(true);

    if (onEvent && currentSequenceTime === 0) {
      onEvent({ type: "sequenceStart" });
    }

    sequenceLoop();
  }

  function pauseSequence() {
    const sequencerHasBeenInitialized = sequencerHasBeenInitializedRef.current;
    const sequenceIsPlaying = sequenceIsPlayingRef.current;
    const sequenceFrameTimeout = sequenceFrameTimeoutRef.current;

    if (!sequencerHasBeenInitialized || !sequenceIsPlaying) {
      return;
    }

    sequenceIsPlayingRef.current = false;
    setIsPlaying(false);

    if (sequenceFrameTimeout) {
      clearTimeout(sequenceFrameTimeout);
      sequenceFrameTimeoutRef.current = null;
    }
  }

  function stopSequence() {
    const sequenceFrameTimeout = sequenceFrameTimeoutRef.current;
    const sequencerHasBeenInitialized = sequencerHasBeenInitializedRef.current;
    const onEvent = onEventRef.current;

    if (!sequencerHasBeenInitialized) return;

    sequenceIsPlayingRef.current = false;
    currentSequenceTimeRef.current = 0;
    currentSequenceBarIndexRef.current = 0;

    setIsPlaying(false);

    if (sequenceFrameTimeout) {
      clearTimeout(sequenceFrameTimeout);
      sequenceFrameTimeoutRef.current = null;
    }

    if (onEvent) {
      onEvent({ type: "sequenceEnd" });
    }
  }

  useEffect(() => {
    const sequenceFrameTimeout = sequenceFrameTimeoutRef.current;

    return () => {
      if (sequenceFrameTimeout) {
        clearTimeout(sequenceFrameTimeout);
      }
    };
  }, []);

  return {
    initSequence,
    initSequenceWithNotation,
    generateSequenceFromNotation,
    playSequence,
    pauseSequence,
    stopSequence,
    isPlaying,
  };
}
