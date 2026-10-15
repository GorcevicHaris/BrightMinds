export type { BaseView, GameProps, GameResult } from "./types";
export { useGameSync } from "./useGameSync";
export { useTimers, type TimerId } from "./useTimers";
export { useIdle, useInputGuard, useWaitHint, IDLE_HINT_MS, WAIT_HINT_MS } from "./useIdle";
export { useDemo, DEMO_MS, PULSE_ONCE } from "./useDemo";
export { useSayAll, useSayThen, useListenGate, listenLimitFor, NARRATION_DELAY_MS, LISTEN_MAX_MS, FEEDBACK_MIN_MS, FEEDBACK_MAX_MS } from "./useNarration";
export { playSfx, type Sfx } from "./sfx";
export { demoRounds, finiteOr, genderText, hintDue, isFemale, offeredOptions, shuffle, toCount, toIndexList } from "./utils";
export {
    GameTeacherContext,
    DemoHand,
    useBubbleTail,
    GameStage,
    PlayArea,
    GameHud,
    GamePrompt,
    ChoiceCard,
    ExplainPanel,
    Feedback,
    OptionSpeaker,
    SpeakButton,
    TriedNote,
    WaitingNote,
    type ChoiceState,
    type FeedbackKind,
} from "./ui";
