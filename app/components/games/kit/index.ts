export type { BaseView, GameProps, GameResult } from "./types";
export { useGameSync } from "./useGameSync";
export { useTimers, type TimerId } from "./useTimers";
export { useIdle, useInputGuard, IDLE_HINT_MS } from "./useIdle";
export { playSfx, type Sfx } from "./sfx";
export { genderText, isFemale, shuffle } from "./utils";
export {
    GameStage,
    GameHud,
    GamePrompt,
    ChoiceCard,
    ExplainPanel,
    Feedback,
    SpeakButton,
    type ChoiceState,
    type FeedbackKind,
} from "./ui";
