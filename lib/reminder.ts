// lib/reminder.ts
// Blag dnevni podsetnik: kada roditelj uključi „Podsetnik” (podešavanja deteta), posle
// izabranog vremena u izabrane dane — ako dete tog dana još nije igralo — početni ekran
// deteta kaže „Vreme je za igru sa drugarom!”, a roditeljski panel „Lejla danas još nije
// vežbala”. Bez obaveštenja na telefonu i bez mejlova: ništa ne ide spoljnim servisima.
// Čist modul; vreme i dan se računaju po Beogradu, kao i ostali dani u aplikaciji.
import type { ReminderSettings, Weekday } from "./childSettings";
import { APP_TIME_ZONE, dateOnlyInTimeZone } from "./validation";

const WEEKDAY_INDEX: Record<string, Weekday> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/** Dan u nedelji (1 = ponedeljak) i vreme „HH:MM” u datoj zoni. */
export function localWeekdayAndTime(now: Date, timeZone: string = APP_TIME_ZONE): { weekday: Weekday; time: string } {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
    return { weekday: WEEKDAY_INDEX[part("weekday")] ?? 1, time: `${part("hour")}:${part("minute")}` };
}

/** Da li je u trenutku `now` vreme za podsetnik (dete danas nije igralo, dan i vreme se poklapaju). */
export function reminderDue(reminder: ReminderSettings, playedToday: boolean, now: Date, timeZone: string = APP_TIME_ZONE): boolean {
    if (!reminder.enabled || playedToday) return false;
    const { weekday, time } = localWeekdayAndTime(now, timeZone);
    return reminder.days.includes(weekday) && time >= reminder.time;
}

/** Da li je trenutak `playedAt` (npr. kraj poslednje partije) bio danas po kalendaru aplikacije. */
export function isToday(playedAt: Date | null, now: Date, timeZone: string = APP_TIME_ZONE): boolean {
    return playedAt !== null && dateOnlyInTimeZone(playedAt, timeZone) === dateOnlyInTimeZone(now, timeZone);
}

/**
 * Početak prozora za upit „da li je dete danas igralo”: 26 sati unazad sigurno obuhvata
 * ceo današnji dan i u danima kad se pomera sat; tačan dan se zatim proverava sa `isToday`.
 */
export function playedTodayWindowStart(now: Date): Date {
    return new Date(now.getTime() - 26 * 60 * 60 * 1000);
}

/** Poruka roditelju: „Lejla danas još nije vežbala.” (oblik prema polu deteta). */
export function parentReminderText(firstName: string, gender: string | null | undefined): string {
    const verb = gender === "female" ? "vežbala" : gender === "male" ? "vežbao" : "vežbao/la";
    return `${firstName} danas još nije ${verb}.`;
}
