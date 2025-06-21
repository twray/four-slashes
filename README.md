# Four Slashes

A tool for songwriters and musicians to create and compose chord progressions
in a simple, accessible, tablet-friendly way: built by and for musicians.

Features:

- A beautiful, simple and dynamic chord builder that allows musicians to create
  and shape chord progressions based upon principles of functional harmony.

- Audio previews and voicings of rendered chords using the
  `VirtualPianoProvider`: an internal playback engine that simulates the
  workings of a real piano, such as high quality samples, note attack and decay
  and pedal effects. It uses the Howl Audio library, which in turn is based
  on the Web Audio APIs, to efficiently load and playback piano samples in
  an efficient manner.

- An in-built sequencer hook -- `useSequencer` -- that not only allows chords to
  be voiced in any possible way, but allows for any kind of sheet music to be
  sequenced in its own, easy to input sequencing language that is similar to and
  follows inspiration from the
  [VexTab Notation Language](https://vexflow.com/vextab/tutorial.html). The
  sequencer allows you to easily input individual notes and their durations,
  chords and rests. It can also handle more complex sequencing such as: multiple
  voicings; linear and non-linear sequencing; the use of ties to
  combine the duration of two notes of the same pitch and automatic
  'pedalling' (such that the sustain pedal is automatically applied on every
  bar, except for such bars where two notes are tied).

- The in-built sequencer provided by the `useSequencer` hook, combined with the
  `VirtualPianoProvider` exposes an API that allows you to easily create and
  play back any kind of piano repertoire in an intuitive and easy to use format.
