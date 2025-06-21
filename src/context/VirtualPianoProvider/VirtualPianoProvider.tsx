import { Howl } from "howler";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import spriteMapRaw from "../../data/audioSpriteMaps/sprite_map_standard.json";
import { getRandomInt } from "../../utils/random";
import { VirtualPianoContext } from "./VirtualPianoContext";
import {
  isValidPianoKey,
  Note,
  noteToPianoKey,
  type PianoKey,
} from "../../utils/music";
import {
  type Bar,
  type SequencerBarEvent,
  type SequencerControlEvent,
  useSequencer,
} from "../../hooks/useSequencer";

type Direction = "up" | "down";
type KeySoundStatus = "sustained" | "decaying" | "stopped";

type ActiveKeysStatus = Record<
  PianoKey,
  { soundId: number; status: KeySoundStatus }[]
>;

type VirtualPianoProviderProps = {
  children: ReactNode;
};

const KEY_FADE_DURATION = 200;

const SpriteMapSchema = z.record(z.string(), z.tuple([z.number(), z.number()]));

const spriteMap = SpriteMapSchema.parse(spriteMapRaw);

function isValidDuration(duration: number) {
  return (
    !Number.isFinite(duration) || (Number.isInteger(duration) && duration > 0)
  );
}

function loadSpriteMap() {
  return new Promise<Howl>((resolve, reject) => {
    const howl = new Howl({
      src: [
        "assets/audio/audio_sprite_standard.ogg",
        "assets/audio/audio_sprite_standard.mp3",
      ],
      sprite: spriteMap,
      preload: true,
    });

    howl.once("load", () => {
      resolve(howl);
    });

    howl.once("loaderror", (_, error) => {
      console.error("Error loading sprite map:", error);
      reject(error);
    });
  });
}

function getSpriteIdForNote(note: PianoKey) {
  return `__note__${note}v5`;
}

export function VirtualPianoProvider({ children }: VirtualPianoProviderProps) {
  const [virtualPianoIsReady, setVirtualPianoIsReady] = useState(false);

  const spriteRef = useRef<Howl | null>(null);

  const sustainPedalStatusRef = useRef<Direction>("up");
  const soundIdOfSustainPedalDownRef = useRef<number | null>(null);
  const sustainPedalIsDownDuringSequencePlaybackRef = useRef(false);

  const activeKeysRef = useRef<ActiveKeysStatus>({} as ActiveKeysStatus);

  const {
    initSequence,
    generateSequenceFromNotation,
    playSequence,
    pauseSequence,
    stopSequence,
  } = useSequencer();

  useEffect(() => {
    const sprite = spriteRef.current;

    (async function () {
      spriteRef.current = await loadSpriteMap();
      setVirtualPianoIsReady(true);
    })();

    return () => {
      sprite?.unload();
    };
  }, [setVirtualPianoIsReady]);

  function getActiveKeys(): PianoKey[] {
    return Object.keys(activeKeysRef.current).filter(
      isValidPianoKey
    ) as PianoKey[];
  }

  function keyIsPlaying(note: PianoKey) {
    return getActiveKeys().includes(note);
  }

  function keyDown(note: PianoKey) {
    const sprite = spriteRef.current;
    const activeKeys = activeKeysRef.current;

    if (!isValidPianoKey(note)) {
      console.warn(`Invalid note ID: ${note}`);
      return;
    }

    if (!sprite) return;

    const spriteId = getSpriteIdForNote(note);
    const soundId = sprite.play(spriteId);

    if (activeKeys[note] === undefined) {
      activeKeys[note] = [];
    }

    activeKeys[note].push({ soundId, status: "sustained" });

    return soundId;
  }

  function keyUp(note: PianoKey, soundId?: number) {
    const sprite = spriteRef.current;
    const activeKeys = activeKeysRef.current;
    const sustainPedalStatus = sustainPedalStatusRef.current;

    if (!isValidPianoKey(note)) {
      console.warn(`Invalid note ID: ${note}`);
      return;
    }

    if (!sprite || !keyIsPlaying(note) || sustainPedalStatus === "down") return;

    const keySoundInstancesToDecay = soundId
      ? [{ soundId, status: "sustained" }]
      : activeKeys[note].filter(
          (keySoundInstance) => keySoundInstance.status === "sustained"
        );

    keySoundInstancesToDecay.forEach((keySoundInstance) => {
      const soundIdToStop = keySoundInstance.soundId;
      keySoundInstance.status = "decaying";

      sprite.fade(1.0, 0.0, KEY_FADE_DURATION, soundIdToStop);

      setTimeout(() => {
        sprite.stop(soundIdToStop);

        activeKeys[note] =
          activeKeys[note]?.filter(
            (keySoundInstance) => keySoundInstance.soundId !== soundIdToStop
          ) || [];

        if (activeKeys[note]?.length === 0) {
          delete activeKeys[note];
        }
      }, KEY_FADE_DURATION);
    });
  }

  function sustainPedalUp() {
    setSustainPedal("up");

    Object.keys(activeKeysRef.current).forEach((note) => {
      if (isValidPianoKey(note)) keyUp(note);
    });
  }

  function sustainPedalDown() {
    setSustainPedal("down");
  }

  function playNote(note: Note, duration = Infinity) {
    const sprite = spriteRef.current;
    const noteAsPianoKey = noteToPianoKey(note);

    console.log({ noteAsPianoKey });

    if (!noteAsPianoKey || !isValidPianoKey(noteAsPianoKey)) {
      console.warn(`Invalid note ID: ${note}`);
      return;
    }

    if (!sprite) return;

    if (!isValidDuration(duration)) {
      throw new Error("Duration must be an integer above 0 or Infinity");
    }

    if (keyIsPlaying(noteAsPianoKey)) {
      keyUp(noteAsPianoKey);
    }

    const soundId = keyDown(noteAsPianoKey);

    const durationAsPlayedBack =
      duration === Infinity
        ? spriteMap[getSpriteIdForNote(noteAsPianoKey)][1] - KEY_FADE_DURATION
        : duration;

    setTimeout(() => {
      keyUp(noteAsPianoKey, soundId);
    }, durationAsPlayedBack);
  }

  function setSustainPedal(direction: Direction) {
    sustainPedalStatusRef.current = direction;

    const sprite = spriteRef.current;

    if (sprite) {
      const spriteId = `__pedal__${direction}${getRandomInt(1, 2)}`;
      const soundId = sprite.play(spriteId);
      sprite.volume(0.05, soundId);

      if (direction === "down") {
        soundIdOfSustainPedalDownRef.current = soundId;
      } else if (direction === "up") {
        const soundIdToStop = soundIdOfSustainPedalDownRef.current;

        if (soundIdToStop) {
          sprite.fade(0.05, 0.0, KEY_FADE_DURATION, soundIdToStop);
          setTimeout(() => {
            if (soundIdToStop) {
              sprite.stop(soundIdToStop);
              soundIdOfSustainPedalDownRef.current = null;
            }
          }, KEY_FADE_DURATION);
        }
      }
    }
  }

  function createSequence(
    bars: Bar[],
    onEvent?: (event: SequencerControlEvent | SequencerBarEvent) => void
  ) {
    function setPedalForSequencePlayback(direction: Direction) {
      if (
        direction === "down" &&
        !sustainPedalIsDownDuringSequencePlaybackRef.current
      ) {
        sustainPedalDown();
        sustainPedalIsDownDuringSequencePlaybackRef.current = true;
      }

      if (
        direction === "up" &&
        sustainPedalIsDownDuringSequencePlaybackRef.current
      ) {
        sustainPedalUp();
        sustainPedalIsDownDuringSequencePlaybackRef.current = false;
      }
    }

    initSequence(bars, (event) => {
      switch (event.type) {
        case "noteStart": {
          const note: PianoKey | undefined = noteToPianoKey(
            event.action.note.pitch
          );

          if (note) {
            keyDown(note);
          } else {
            console.warn(`Invalid note ID: ${event.action.note.pitch}`);
          }
          break;
        }
        case "noteEnd": {
          const note: PianoKey | undefined = noteToPianoKey(
            event.action.note.pitch
          );

          if (note) {
            keyUp(note);
          } else {
            console.warn(`Invalid note ID: ${event.action.note.pitch}`);
          }
          break;
        }
        case "sustainPedalDown": {
          setPedalForSequencePlayback("down");
          break;
        }
        case "sustainPedalUp": {
          setPedalForSequencePlayback("up");
          break;
        }
        case "barStart": {
          if (onEvent) onEvent({ type: "barStart", barIndex: event.barIndex });
          break;
        }
        case "sequenceStart": {
          if (onEvent) onEvent({ type: "sequenceStart" });
          break;
        }
        case "sequenceEnd": {
          setPedalForSequencePlayback("up");
          if (onEvent) onEvent({ type: "sequenceEnd" });
          break;
        }
        default:
      }
    });

    return {
      playSequence: () => {
        setPedalForSequencePlayback(
          sustainPedalIsDownDuringSequencePlaybackRef.current ? "down" : "up"
        );
        playSequence();
      },
      pauseSequence: () => {
        setPedalForSequencePlayback("up");
        pauseSequence();
      },
      stopSequence: () => {
        setPedalForSequencePlayback("up");
        stopSequence();
      },
    };
  }

  function createSequenceWithNotation(
    notation: string,
    onEvent?: (event: SequencerControlEvent | SequencerBarEvent) => void
  ) {
    return createSequence(generateSequenceFromNotation(notation), onEvent);
  }

  return (
    <VirtualPianoContext.Provider
      value={{
        virtualPianoIsReady,
        createSequence,
        createSequenceWithNotation,
        playNote,
        keyDown,
        keyUp,
        sustainPedalUp,
        sustainPedalDown,
      }}
    >
      {children}
    </VirtualPianoContext.Provider>
  );
}
