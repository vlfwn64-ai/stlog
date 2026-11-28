import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Exercise } from "../exercises";
import {
  ADD_EQUIP,
  ADD_MUS,
  EQUIP,
  chipsOf,
  loadExercises,
  matches,
} from "../exercises";
import {
  addCustomExercise,
  deleteEtc,
  dropEtcItem,
  finishEtc,
  pickEtc,
  removeEtcItem,
  startEtc,
} from "../actions";
import type { AppState, EtcItem, SetRow } from "../store";
import { uid, useApp } from "../store";
import { CARD_ORDER, ETC_TH, TH, fmt, md } from "../theme";
import { L, dayTitle } from "../i18n";
import { Confirm, Sheet } from "../ui";
import type { Go, Route } from "../App";

/* ───────── 작은 조각 ───────── */

/** 운동 시간: 훈련 시작부터 흐른 시간 (1시간 넘으면 0:00:00) */
export function Elapsed({
  start,
  size = 22,
}: {
  start: number;
  size?: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const sec = Math.max(0, Math.floor((now - start) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const ss = String(sec % 60).padStart(2, "0");
  const text = h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
  return (
    <span
      role="timer"
      aria-label={L("운동 시간", "Workout time")}
      className="num"
      style={{
        fontSize: size,
        fontWeight: 800,
        color: "var(--ink)",
        minWidth: 64,
      }}
    >
      {text}
    </span>
  );
}

/** 주동근(짙은 칸) · 협력근(옅은 칸) */
export function MusChips({ ex }: { ex: { mus: string[]; sec: string[] } }) {
  const { primary, secondary } = chipsOf(ex);
  const chip = (t: string, strong: boolean) => (
    <span
      style={{
        height: 22,
        padding: "0 7px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        lineHeight: "22px",
        whiteSpace: "nowrap",
        background: strong ? ETC_TH.acc : "var(--fill)",
        color: strong ? "#fff" : "var(--sub)",
      }}
    >
      {t}
    </span>
  );
  return (
    <span style={{ display: "inline-flex", gap: 4, flexShrink: 0 }}>
      {primary && chip(primary, true)}
      {secondary && chip(secondary, false)}
    </span>
  );
}

/** "22.5kg × 12" (가장 무거운 세트), 맨몸이면 "체중 × 10" */
export const bestLine = (sets: SetRow[], u: string) => {
  const m = sets
    .filter((r) => r.type !== "W")
    .reduce<SetRow | undefined>(
      (a, r) =>
        !a || r.weight > a.weight || (r.weight === a.weight && r.reps > a.reps)
          ? r
          : a,
      undefined,
    );
  if (!m) return "";
  return `${m.weight ? `${fmt(m.weight)}${u}` : L("체중", "BW")} × ${m.reps}`;
};

/** "22.5kg × 12 · 12 · 12" (무게가 같으면 횟수만 이어서) */
export const setsLine = (sets: SetRow[], u: string) => {
  const w = sets.filter((r) => r.type !== "W");
  if (!w.length) return "";
  const wt = (x: number) => (x ? `${fmt(x)}${u}` : L("체중", "BW"));
  if (w.every((r) => r.weight === w[0].weight))
    return `${wt(w[0].weight)} × ${w.map((r) => r.reps).join(" · ")}`;
  return w.map((r) => `${wt(r.weight)}×${r.reps}`).join(" · ");
};

const card = {
  background: "var(--fill2)",
  borderRadius: 16,
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  gap: 10,
} as const;
const bigBtn = (bg: string, fg: string) =>
  ({
    height: 56,
    borderRadius: 14,
    background: bg,
    color: fg,
    fontSize: 17,
    fontWeight: 700,
  }) as const;

/* ───────── ETC 탭 (종목 화면) ───────── */

/** 종목별 최근 기록: 운동마다 마지막으로 한 날 */
function recentByExercise(s: AppState) {
  const seen = new Map<string, { item: EtcItem; date: string }>();
  const logs = [...(s.etcLogs ?? [])].reverse();
  for (const l of logs)
    for (const it of [...l.items].reverse())
      if (!seen.has(it.ex.id)) seen.set(it.ex.id, { item: it, date: l.date });
  return [...seen.values()];
}

export function EtcLift({ go, slide }: { go: Go; slide?: "left" | "right" }) {
  const s = useApp();
  const u = s.settings.unit;
  const recent = recentByExercise(s);
  const live = !!s.etcActive;
  return (
    <div
      className="screen"
      onTouchStart={(e) =>
        (swipeStart = { x: e.touches[0].clientX, y: e.touches[0].clientY })
      }
      onTouchEnd={(e) => {
        const st0 = swipeStart;
        swipeStart = null;
        if (!st0) return;
        const dx = e.changedTouches[0].clientX - st0.x;
        const dy = e.changedTouches[0].clientY - st0.y;
        if (dx > 60 && Math.abs(dx) > Math.abs(dy) * 1.5)
          go({
            name: "lift",
            lift: CARD_ORDER[CARD_ORDER.length - 1],
            from: "left",
          });
      }}
    >
      <LiftTabs cur="E" go={go} />
      <main
        className="scroll"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "8px 20px 0",
          animation: slide
            ? `${slide === "right" ? "fromRight" : "fromLeft"} 260ms cubic-bezier(0.2,0.8,0.2,1) both`
            : undefined,
        }}
      >
        <h1 style={{ fontSize: 21, fontWeight: 800 }}>
          {L("자유 훈련", "Free training")}
        </h1>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>
          {L("종목별 최근 기록", "Latest by exercise")}
        </h2>
        {recent.length === 0 && (
          <p
            style={{ fontSize: 14, color: "var(--mute)", padding: "12px 4px" }}
          >
            {L(
              "아직 자유 훈련 기록이 없어요. 훈련을 시작해 운동을 골라 보세요.",
              "No free training yet. Start one and pick an exercise.",
            )}
          </p>
        )}
        {recent.map(({ item, date }) => (
          <div key={item.ex.id} style={card}>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700 }}>
                {L(item.ex.ko, item.ex.en)}
              </span>
              <MusChips ex={item.ex} />
            </span>
            <span
              className="num"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                flexShrink: 0,
              }}
            >
              <b style={{ fontSize: 16 }}>{bestLine(item.sets, u)}</b>
              <span style={{ fontSize: 12, color: "var(--mute)" }}>
                {md(date)}
              </span>
            </span>
          </div>
        ))}
        <div style={{ height: 16 }} />
      </main>
      <div style={{ padding: "10px 20px var(--safe-bot)" }}>
        <button
          onClick={() => {
            startEtc();
            go({ name: "etcLobby" });
          }}
          style={{ ...bigBtn(ETC_TH.acc, ETC_TH.on), width: "100%" }}
        >
          {live
            ? L("자유 훈련 이어서", "Resume free training")
            : L("훈련 시작", "Start workout")}
        </button>
      </div>
    </div>
  );
}
let swipeStart: { x: number; y: number } | null = null;

/** 종목 화면 위쪽 탭: Bench · Deadlift · Squat · ETC */
export function LiftTabs({ cur, go }: { cur: "B" | "D" | "S" | "E"; go: Go }) {
  const order = [...CARD_ORDER, "E" as const];
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "12px 12px 0 8px",
        borderBottom: "1px solid var(--fill)",
      }}
    >
      <button
        aria-label={L("홈으로", "Home")}
        onClick={() => go({ name: "home" })}
        style={{
          width: 44,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#191F28"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>
      <nav
        aria-label={L("종목", "Lifts")}
        style={{ display: "flex", gap: 4, flex: 1 }}
      >
        {order.map((k) => {
          const on = k === cur;
          const th = k === "E" ? ETC_TH : TH[k];
          const from = order.indexOf(k) > order.indexOf(cur) ? "right" : "left";
          return (
            <button
              key={k}
              aria-current={on ? "page" : undefined}
              onClick={() =>
                !on &&
                go(
                  k === "E"
                    ? { name: "etc", from }
                    : { name: "lift", lift: k, from },
                )
              }
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                paddingTop: 10,
              }}
            >
              <span
                style={{
                  fontSize: 16,
                  fontWeight: on ? 700 : 500,
                  color: on ? th.text : "var(--sub)",
                }}
              >
                {th.tab}
              </span>
              <span
                style={{
                  width: on ? "100%" : "60%",
                  height: 3,
                  borderRadius: 2,
                  background: th.acc,
                }}
              />
            </button>
          );
        })}
      </nav>
    </header>
  );
}

/* ───────── 로비: 가운데 ETC, 운동 시간 이어서, 맨 밑 종목 선택 ───────── */

export function EtcLobby({
  go,
  logId,
  back,
}: {
  go: Go;
  logId?: string;
  back?: Route;
}) {
  const s = useApp();
  const u = s.settings.unit;
  const a = s.etcActive;
  const log = logId ? (s.etcLogs ?? []).find((l) => l.id === logId) : undefined;
  const [pick, setPick] = useState(false);
  const [ask, setAsk] = useState<null | "end" | "delete">(null);
  const items = log ? log.items : (a?.items ?? []);

  useEffect(() => {
    if (logId ? !log : !a) go(back ?? { name: "home" });
  }, [a, log, logId, go, back]);
  if (logId ? !log : !a) return null;

  const minutes = (start: number, end: number) =>
    Math.max(1, Math.round((end - start) / 60000));

  if (ask === "end" && a) {
    const sets = items.reduce((n, it) => n + it.sets.length, 0);
    return (
      <Confirm
        eyebrow={`ETC · ${dayTitle(a.date)}`}
        title={
          items.length
            ? L("자유 훈련을 끝낼까요?", "Finish free training?")
            : L("기록 없이 끝낼까요?", "End without logging?")
        }
        rows={[
          [L("운동", "Exercises"), L(`${items.length}종목`, `${items.length}`)],
          [L("세트", "Sets"), L(`총 ${sets}세트`, `${sets} sets`)],
          [
            L("운동 시간", "Time"),
            L(
              `${minutes(a.start, Date.now())}분`,
              `${minutes(a.start, Date.now())} min`,
            ),
          ],
        ]}
        cta={L("훈련 종료하기", "Finish")}
        onCancel={() => setAsk(null)}
        onOk={() => {
          finishEtc();
          go({ name: "home", tab: "rec" });
        }}
      />
    );
  }
  if (ask === "delete" && log) {
    return (
      <Confirm
        eyebrow={`ETC · ${dayTitle(log.date)}`}
        title={L("이 자유 훈련 기록을 지울까요?", "Delete this free training?")}
        rows={[
          [
            L("운동", "Exercises"),
            L(`${log.items.length}종목`, `${log.items.length}`),
          ],
        ]}
        cta={L("지우기", "Delete")}
        onCancel={() => setAsk(null)}
        onOk={() => {
          deleteEtc(log.id);
          go(back ?? { name: "home", tab: "rec" });
        }}
      />
    );
  }

  return (
    <div className="screen">
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          padding: "12px 12px 8px 8px",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            aria-label={L("뒤로", "Back")}
            onClick={() =>
              go(
                log ? (back ?? { name: "home", tab: "rec" }) : { name: "home" },
              )
            }
            style={{
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#191F28"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          {a && !log ? (
            <Elapsed start={a.start} />
          ) : (
            log && (
              <span
                style={{ fontSize: 15, fontWeight: 700, color: "var(--sub)" }}
              >
                {dayTitle(log.date)}
              </span>
            )
          )}
        </span>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: ETC_TH.text }}>
          ETC
        </h1>
        <span />
      </header>
      <main
        className="scroll"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "8px 20px 0",
        }}
      >
        {a?.cur && !log && (
          <button
            onClick={() => go({ name: "etcWorkout" })}
            style={{
              ...card,
              border: `2px solid ${ETC_TH.line}`,
              background: ETC_TH.tint,
              textAlign: "left",
            }}
          >
            <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <span
                style={{ fontSize: 12, fontWeight: 700, color: ETC_TH.text }}
              >
                {L("기록 중", "In progress")}
              </span>
              <span style={{ fontSize: 16, fontWeight: 700 }}>
                {L(a.cur.ex.ko, a.cur.ex.en)}
              </span>
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: ETC_TH.text }}>
              {L("이어서 ›", "Resume ›")}
            </span>
          </button>
        )}
        {items.length > 0 && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--sub)",
              padding: "4px 4px 0",
            }}
          >
            {log
              ? L(
                  `${items.length}종목 · 운동을 눌러 고쳐요`,
                  `${items.length} exercises · tap to edit`,
                )
              : L(
                  `오늘 한 운동 ${items.length}종목`,
                  `${items.length} done today`,
                )}
          </span>
        )}
        {items.map((it, i) => (
          <div key={`${it.ex.id}-${i}`} style={card}>
            <button
              onClick={() =>
                log
                  ? go({
                      name: "etcEdit",
                      id: log.id,
                      i,
                      back: { name: "etcLog", id: log.id, back },
                    })
                  : undefined
              }
              disabled={!log}
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                textAlign: "left",
                gap: 2,
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700 }}>
                {L(it.ex.ko, it.ex.en)}
              </span>
              <span
                className="num"
                style={{ fontSize: 13, color: "var(--sub)" }}
              >
                {setsLine(it.sets, u)}
              </span>
            </button>
            {!log && (
              <button
                aria-label={L("이 운동 빼기", "Remove")}
                onClick={() => removeEtcItem(i)}
                style={{
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--mute)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </main>
      <div
        style={{
          padding: "10px 20px var(--safe-bot)",
          display: "flex",
          gap: 8,
        }}
      >
        {(log || items.length > 0) && (
          <button
            onClick={() => setAsk(log ? "delete" : "end")}
            style={{
              width: 120,
              flexShrink: 0,
              height: 56,
              borderRadius: 14,
              border: "1.5px solid var(--line)",
              background: "var(--surface)",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--ink2)",
            }}
          >
            {log ? L("삭제", "Delete") : L("훈련 종료", "Finish")}
          </button>
        )}
        <button
          onClick={() => setPick(true)}
          style={{ ...bigBtn(ETC_TH.acc, ETC_TH.on), flex: 1 }}
        >
          {log
            ? L("+ 운동 추가", "+ Add exercise")
            : L("종목 선택", "Pick exercise")}
        </button>
      </div>
      {pick && (
        <EtcPicker
          onClose={() => setPick(false)}
          onStart={(e) => {
            setPick(false);
            if (log)
              return go({
                name: "etcEdit",
                id: log.id,
                i: log.items.length,
                ex: { id: e.id, ko: e.ko, en: e.en, mus: e.mus, sec: e.sec },
                back: { name: "etcLog", id: log.id, back },
              });
            if (a?.cur) dropEtcItem();
            pickEtc(e);
            go({ name: "etcWorkout" });
          }}
        />
      )}
    </div>
  );
}

/* ───────── 종목 선택 팝업 ───────── */

const PAGE = 60;

function EtcPicker({
  onStart,
  onClose,
}: {
  onStart: (e: Exercise) => void;
  onClose: () => void;
}) {
  const s = useApp();
  const [db, setDb] = useState<Exercise[] | null>(null);
  const [q, setQ] = useState("");
  const [eq, setEq] = useState(-1);
  const [sel, setSel] = useState<Exercise | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let live = true;
    loadExercises().then((d) => live && setDb(d));
    return () => {
      live = false;
    };
  }, []);

  // 최근에 한 운동 → 직접 만든 운동 → 인기 운동 → 나머지
  const list = useMemo(() => {
    if (!db) return [];
    const recent = recentByExercise(s).map((r) => r.item.ex.id);
    const all = [...(s.customExercises ?? []), ...db];
    const rank = (e: Exercise) => {
      const i = recent.indexOf(e.id);
      return i >= 0 ? i : 1000;
    };
    const g = EQUIP[eq];
    return all
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => matches(e, q) && (!g || g.test(e)))
      .sort((x, y) => rank(x.e) - rank(y.e) || x.i - y.i)
      .map(({ e }) => e);
  }, [db, s, q, eq]);

  if (adding)
    return (
      <EtcAdd
        onClose={() => setAdding(false)}
        onSave={(e) => {
          addCustomExercise(e);
          setAdding(false);
          setSel(e);
          setQ("");
          setEq(-1);
        }}
      />
    );

  const chip = (label: string, on: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      aria-pressed={on}
      style={{
        flexShrink: 0,
        height: 38,
        padding: "0 16px",
        borderRadius: 19,
        fontSize: 15,
        fontWeight: on ? 700 : 600,
        background: on ? ETC_TH.acc : "var(--fill)",
        color: on ? "#fff" : "var(--ink2)",
      }}
    >
      {label}
    </button>
  );

  return (
    <Sheet
      onClose={onClose}
      tall
      gap={12}
      title={
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            width: "100%",
          }}
        >
          {L("종목 선택", "Pick exercise")}
          <button
            onClick={() => setAdding(true)}
            style={{
              height: 36,
              padding: "0 12px",
              borderRadius: 10,
              background: "var(--fill)",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--ink)",
            }}
          >
            {L("+ 운동 추가", "+ New")}
          </button>
        </span>
      }
    >
      <label
        style={{
          display: "flex",
          flexShrink: 0,
          alignItems: "center",
          gap: 8,
          height: 48,
          borderRadius: 12,
          background: "var(--fill)",
          padding: "0 14px",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--mute)"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setShown(PAGE);
          }}
          placeholder={L("운동 이름 검색", "Search exercises")}
          aria-label={L("운동 이름 검색", "Search exercises")}
          style={{
            flex: 1,
            border: "none",
            background: "none",
            fontSize: 16,
            color: "var(--ink)",
            outline: "none",
            height: "100%",
          }}
        />
      </label>
      <div
        data-nodrag
        style={{
          display: "flex",
          flexShrink: 0,
          gap: 6,
          overflowX: "auto",
          paddingBottom: 2,
          scrollbarWidth: "none",
        }}
      >
        {chip(L("전체", "All"), eq === -1, () => (setEq(-1), setShown(PAGE)))}
        {EQUIP.map((g, i) =>
          chip(L(g.ko, g.en), eq === i, () => (setEq(i), setShown(PAGE))),
        )}
      </div>
      {!db && (
        <span
          style={{ fontSize: 14, color: "var(--mute)", padding: "8px 4px" }}
        >
          {L("불러오는 중…", "Loading…")}
        </span>
      )}
      <div
        role="radiogroup"
        aria-label={L("운동", "Exercises")}
        style={{ display: "flex", flexShrink: 0, flexDirection: "column" }}
      >
        {list.slice(0, shown).map((e) => {
          const on = sel?.id === e.id;
          return (
            <button
              key={e.id}
              role="radio"
              aria-checked={on}
              onClick={() => setSel(on ? null : e)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minHeight: 60,
                padding: "8px 0",
                textAlign: "left",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 700 }}>
                  {L(e.ko, e.en)}
                </span>
                <MusChips ex={e} />
              </span>
              <span
                aria-hidden="true"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  flexShrink: 0,
                  border: on ? "none" : "2px solid var(--line2)",
                  background: on ? ETC_TH.acc : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {on && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
        {db && list.length === 0 && (
          <div
            style={{
              padding: "24px 0",
              textAlign: "center",
              fontSize: 14,
              color: "var(--mute)",
            }}
          >
            {L(
              "맞는 운동이 없어요. + 운동 추가로 만들 수 있어요.",
              "No matches. Use + New to add one.",
            )}
          </div>
        )}
      </div>
      {list.length > shown && (
        <button
          onClick={() => setShown(shown + PAGE)}
          style={{
            flexShrink: 0,
            height: 44,
            borderRadius: 12,
            background: "var(--fill)",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--ink2)",
          }}
        >
          {L("더 보기", "Show more")}
        </button>
      )}
      <div
        style={{
          position: "sticky",
          bottom: "calc(-1 * var(--safe-bot))",
          flexShrink: 0,
          margin: "0 -20px calc(-1 * var(--safe-bot))",
          padding: "8px 20px var(--safe-bot)",
          background: "var(--surface)",
        }}
      >
        <button
          disabled={!sel}
          onClick={() => sel && onStart(sel)}
          style={{
            ...bigBtn(
              sel ? "var(--ink)" : "var(--fill)",
              sel ? "var(--onInk)" : "var(--mute)",
            ),
            width: "100%",
          }}
        >
          {sel
            ? L(`${sel.ko} 시작`, `Start ${sel.en}`)
            : L("운동을 골라 주세요", "Pick an exercise")}
        </button>
      </div>
    </Sheet>
  );
}

/* ───────── 운동 추가 (직접 만들기) ───────── */

function EtcAdd({
  onSave,
  onClose,
}: {
  onSave: (e: Exercise) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [eq, setEq] = useState<string | null>(null);
  const [mus, setMus] = useState<string | null>(null);
  const [sec, setSec] = useState<string[]>([]);
  const ok = name.trim().length > 0 && !!mus;

  const row = (label: string, children: ReactNode) => (
    <section
      style={{
        display: "flex",
        flexShrink: 0,
        flexDirection: "column",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink2)" }}>
        {label}
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {children}
      </div>
    </section>
  );
  const pill = (
    t: string,
    style: "solid" | "outline" | "off",
    onClick: () => void,
  ) => (
    <button
      key={t}
      onClick={onClick}
      aria-pressed={style !== "off"}
      style={{
        height: 40,
        padding: "0 14px",
        borderRadius: 20,
        fontSize: 15,
        fontWeight: 600,
        background: style === "solid" ? ETC_TH.acc : "var(--fill)",
        color: style === "solid" ? "#fff" : "var(--ink2)",
        border:
          style === "outline"
            ? `2px solid ${ETC_TH.line}`
            : "2px solid transparent",
      }}
    >
      {t}
    </button>
  );

  return (
    <Sheet
      onClose={onClose}
      tall
      gap={16}
      title={L("운동 추가", "New exercise")}
    >
      <section
        style={{
          display: "flex",
          flexShrink: 0,
          flexDirection: "column",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink2)" }}>
          {L("이름", "Name")}
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={L(
            "예: 케이블 리어 델트 플라이",
            "e.g. Cable rear delt fly",
          )}
          aria-label={L("운동 이름", "Exercise name")}
          style={{
            height: 52,
            borderRadius: 12,
            border: `2px solid ${name ? ETC_TH.line : "transparent"}`,
            background: "var(--fill)",
            padding: "0 14px",
            fontSize: 17,
            fontWeight: 700,
            color: "var(--ink)",
            outline: "none",
          }}
        />
      </section>
      {row(
        L("분류", "Type"),
        ADD_EQUIP.map((t) =>
          pill(t, eq === t ? "solid" : "off", () => setEq(eq === t ? null : t)),
        ),
      )}
      {row(
        L("주동근", "Main muscle"),
        ADD_MUS.map((t) =>
          pill(
            t,
            mus === t ? "solid" : "off",
            () => (setMus(t), setSec(sec.filter((x) => x !== t))),
          ),
        ),
      )}
      {row(
        L("협력근", "Helper muscles"),
        ADD_MUS.map((t) =>
          pill(
            t,
            sec.includes(t) ? "outline" : "off",
            () =>
              t !== mus &&
              setSec(
                sec.includes(t) ? sec.filter((x) => x !== t) : [...sec, t],
              ),
          ),
        ),
      )}
      <div
        style={{
          position: "sticky",
          bottom: "calc(-1 * var(--safe-bot))",
          flexShrink: 0,
          margin: "0 -20px calc(-1 * var(--safe-bot))",
          padding: "8px 20px var(--safe-bot)",
          background: "var(--surface)",
        }}
      >
        <button
          disabled={!ok}
          onClick={() =>
            onSave({
              id: `custom-${uid()}`,
              ko: name.trim(),
              en: name.trim(),
              eq: eq ?? "기타",
              mus: mus ? [mus] : [],
              sec,
              cat: "근력",
              lv: "",
              k: "B",
              steps: [],
              tip: "",
            })
          }
          style={{
            ...bigBtn(
              ok ? "var(--ink)" : "var(--fill)",
              ok ? "var(--onInk)" : "var(--mute)",
            ),
            width: "100%",
          }}
        >
          {L("저장", "Save")}
        </button>
      </div>
    </Sheet>
  );
}

/* ───────── 날짜 시트: 자유 훈련 한 묶음 ───────── */

export function EtcDayCard({
  log,
  go,
  back,
  onClose,
  onDelete,
}: {
  log: NonNullable<AppState["etcLogs"]>[number];
  go: Go;
  back: Route;
  onClose: () => void;
  onDelete: () => void;
}) {
  const s = useApp();
  const u = s.settings.unit;
  const sets = log.items.reduce((n, it) => n + it.sets.length, 0);
  const min = Math.max(1, Math.round((log.end - log.start) / 60000));
  const tag = (t: string) => (
    <span
      style={{
        height: 26,
        padding: "0 10px",
        borderRadius: 8,
        background: "var(--fill)",
        fontSize: 12,
        fontWeight: 700,
        color: "var(--ink2)",
        lineHeight: "26px",
        whiteSpace: "nowrap",
      }}
    >
      {t}
    </span>
  );
  return (
    <article style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          padding: "0 4px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: ETC_TH.text }}>
          ETC · {L("자유 훈련", "Free training")} ·{" "}
          {L(`${log.items.length}종목`, `${log.items.length} exercises`)}
        </span>
        <span style={{ display: "flex", gap: 6 }}>
          {tag(L(`운동 시간 ${min}분`, `${min} min`))}
          {tag(L(`총 ${sets}세트`, `${sets} sets`))}
        </span>
      </div>
      {log.items.map((it, i) => (
        <div key={i} style={{ ...card, justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            {L(it.ex.ko, it.ex.en)}
          </span>
          <span
            className="num"
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--ink2)",
              textAlign: "right",
            }}
          >
            {setsLine(it.sets, u)}
          </span>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onDelete}
          style={{
            width: 96,
            flexShrink: 0,
            height: 48,
            borderRadius: 12,
            background: "var(--fill)",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--ink2)",
          }}
        >
          {L("삭제", "Delete")}
        </button>
        <button
          onClick={() => {
            onClose();
            go({ name: "etcLog", id: log.id, back });
          }}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 12,
            background: ETC_TH.acc,
            color: ETC_TH.on,
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          {L("수정", "Edit")}
        </button>
      </div>
    </article>
  );
}
