"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import ccommunifestLogo from "@/ccommunifest-logo.png";
import communityRunLogo from "@/community-run-logo.png";
import leaderboardLogo from "@/lb-logo.png";
import runningLogo from "@/running-logo.png";
import { useCamera } from "@/hooks/use-camera";
import { useLocalTime } from "@/hooks/use-local-time";
import {
  DASHBOARD_SETTINGS_STORAGE_KEY,
  DASHBOARD_SETTINGS_UPDATED_EVENT,
  defaultDashboardSettings,
  readDashboardSettings,
} from "@/lib/dashboard-settings";
import type {
  LeaderboardEntry,
  PublicDisplayFeed,
  PublicDisplayFinisher,
  RaceDivision,
  RecentDivisionFinisher,
} from "@/lib/types";

const DISPLAY_TIME_ZONE = "Asia/Manila";
const BASE_STAGE_WIDTH = 1280;
const BASE_STAGE_HEIGHT = 850;
const STAGE_WIDTH = 1600;
const STAGE_HEIGHT = 900;
const STAGE_X_RATIO = STAGE_WIDTH / BASE_STAGE_WIDTH;
const STAGE_Y_RATIO = STAGE_HEIGHT / BASE_STAGE_HEIGHT;

function sx(value: number) {
  return value * STAGE_X_RATIO;
}

function sy(value: number) {
  return value * STAGE_Y_RATIO;
}

function formatStartTime(value: string | null) {
  if (!value) {
    return "--:--";
  }

  const formatted = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(value));

  return formatted.replace("AM", "A.M.").replace("PM", "P.M.");
}

function formatRaceClock(value: Date | null, startTimeIso: string | null) {
  if (!value || !startTimeIso) {
    return {
      hours: "00",
      minutes: "00",
      seconds: "00",
    };
  }

  const startTime = new Date(startTimeIso);
  const elapsedMs = Math.max(0, value.getTime() - startTime.getTime());
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return {
    hours,
    minutes,
    seconds,
  };
}

function getRaceClockReferenceTime(
  localTime: Date | null,
  raceStatus: "idle" | "running" | "ended",
  raceEndTimeIso: string | null,
) {
  if (raceStatus === "ended" && raceEndTimeIso) {
    return new Date(raceEndTimeIso);
  }

  if (raceStatus === "running") {
    return localTime;
  }

  return null;
}

function createEmptyFeed(): PublicDisplayFeed {
  return {
    finishers: [],
    masterlistPath: "",
    resultsPath: "",
    updatedAt: new Date().toISOString(),
  };
}

function formatElapsedTime(elapsedMs: number) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

function isClockTimeString(value: string) {
  return /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|A\.M\.|P\.M\.)?$/i.test(value.trim());
}

function parseComparableTimeValue(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.getTime();
  }

  const match = value
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|A\.M\.|P\.M\.)?$/i);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? "0");
  const meridiem = match[4]?.replace(/\./g, "").toUpperCase() ?? null;

  if (meridiem === "AM" && hours === 12) {
    hours = 0;
  } else if (meridiem === "PM" && hours < 12) {
    hours += 12;
  }

  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

function getComparableRaceTime(finisher: PublicDisplayFinisher) {
  const elapsedTime = parseComparableTimeValue(finisher.finishTimeFromStart);

  if (elapsedTime !== null) {
    return elapsedTime;
  }

  return parseComparableTimeValue(finisher.finishTimestamp);
}

function formatFinishTimeLabel(
  finisher: PublicDisplayFinisher,
  raceStartTimeIso: string | null,
) {
  if (finisher.finishTimeFromStart) {
    return finisher.finishTimeFromStart;
  }

  if (finisher.finishTimestamp) {
    const parsedFinishTime = new Date(finisher.finishTimestamp);

    if (!Number.isNaN(parsedFinishTime.getTime())) {
      if (raceStartTimeIso) {
        const parsedStartTime = new Date(raceStartTimeIso);

        if (!Number.isNaN(parsedStartTime.getTime())) {
          return formatElapsedTime(parsedFinishTime.getTime() - parsedStartTime.getTime());
        }
      }
    }

    if (isClockTimeString(finisher.finishTimestamp)) {
      return finisher.finishTimestamp;
    }
  }

  return "--:--:--";
}

function compareFinishersByRaceTime(
  left: PublicDisplayFinisher,
  right: PublicDisplayFinisher,
) {
  const leftRaceTime = getComparableRaceTime(left);
  const rightRaceTime = getComparableRaceTime(right);

  if (leftRaceTime === null && rightRaceTime === null) {
    return left.rowNumber - right.rowNumber;
  }

  if (leftRaceTime === null) {
    return 1;
  }

  if (rightRaceTime === null) {
    return -1;
  }

  if (leftRaceTime !== rightRaceTime) {
    return leftRaceTime - rightRaceTime;
  }

  const leftFinishTimestamp = parseComparableTimeValue(left.finishTimestamp);
  const rightFinishTimestamp = parseComparableTimeValue(right.finishTimestamp);

  if (leftFinishTimestamp !== null || rightFinishTimestamp !== null) {
    if (leftFinishTimestamp === null) {
      return 1;
    }

    if (rightFinishTimestamp === null) {
      return -1;
    }

    if (leftFinishTimestamp !== rightFinishTimestamp) {
      return leftFinishTimestamp - rightFinishTimestamp;
    }
  }

  return left.rowNumber - right.rowNumber;
}

function createDivisionRankMap(
  finishers: PublicDisplayFinisher[],
  division: RaceDivision,
) {
  return new Map(
    finishers
      .filter((finisher) => finisher.division === division)
      .sort(compareFinishersByRaceTime)
      .map((finisher, index) => [finisher.id, index + 1]),
  );
}

function buildLeaderboardEntries(
  finishers: PublicDisplayFinisher[],
  division: RaceDivision,
  raceStartTimeIso: string | null,
) {
  const divisionRanks = createDivisionRankMap(finishers, division);

  return finishers
    .filter((finisher) => finisher.division === division)
    .sort(compareFinishersByRaceTime)
    .slice(0, 3)
    .map(
      (finisher): LeaderboardEntry => ({
        id: finisher.id,
        division,
        place: divisionRanks.get(finisher.id) ?? 0,
        bibNumber: finisher.bibNumber,
        runnerName: finisher.runnerName,
        finishTime: formatFinishTimeLabel(finisher, raceStartTimeIso),
      }),
    );
}

function buildRecentFinishers(
  finishers: PublicDisplayFinisher[],
  division: RaceDivision,
  raceStartTimeIso: string | null,
) {
  const divisionRanks = createDivisionRankMap(finishers, division);

  return finishers
    .filter((finisher) => finisher.division === division)
    .sort((left, right) => left.rowNumber - right.rowNumber)
    .slice(-4)
    .map(
      (finisher): RecentDivisionFinisher => ({
        id: finisher.id,
        division,
        sequenceNumber: divisionRanks.get(finisher.id) ?? 0,
        bibNumber: finisher.bibNumber,
        runnerName: finisher.runnerName,
        finishTime: formatFinishTimeLabel(finisher, raceStartTimeIso),
      }),
    );
}

function PedestalIcon() {
  return (
    <svg width="40" height="35" viewBox="0 0 50 40" aria-hidden="true">
      <path
        d="M 22 12 L 32 7 L 42 12 L 32 17 Z"
        fill="#FFF"
        stroke="#FFF"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M 22 12 L 22 27 L 32 32 L 32 17 Z"
        fill="#FFF"
        stroke="#FFF"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M 42 12 L 42 27 L 32 32 L 32 17 Z"
        fill="#FFF"
        stroke="#FFF"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text
        x="32"
        y="26"
        fill="#FFF"
        fontSize="14"
        fontFamily="var(--font-festival-title)"
        textAnchor="middle"
      >
        1
      </text>
      <path
        d="M 12 22 L 22 17 L 32 22 L 22 27 Z"
        fill="#FFF"
        stroke="#FFF"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M 12 22 L 12 32 L 22 37 L 22 27 Z"
        fill="#FFF"
        stroke="#FFF"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DigitalDigits({ value, className }: { value: string; className?: string }) {
  return (
    <span className={`inline-flex ${className}`}>
      {value.split("").map((char, i) => (
        <span key={i} className="inline-block w-[0.5em] text-center">
          {char}
        </span>
      ))}
    </span>
  );
}

function MedalIcon({ place }: { place: number }) {
  const medal =
    place === 1
      ? { fill: "#FCA728", stroke: "#D38C1B" }
      : place === 2
        ? { fill: "#E0E0E0", stroke: "#A0A0A0" }
        : { fill: "#D2774A", stroke: "#A55A35" };

  return (
    <svg width="24" height="32" viewBox="0 0 24 32" aria-hidden="true">
      <path d="M2,2 L12,16 L22,2 Z" fill="#739BFF" />
      <circle cx="12" cy="18" r="8" fill={medal.fill} stroke={medal.stroke} strokeWidth="1" />
      <text
        x="12"
        y="21.5"
        fill="#FFF"
        fontSize="9"
        fontFamily="Arial, sans-serif"
        fontWeight="700"
        textAnchor="middle"
      >
        {place}
      </text>
    </svg>
  );
}

function LeaderboardSection({
  division,
  entries,
}: {
  division: RaceDivision;
  entries: LeaderboardEntry[];
}) {
  const titleClass = division === "male" ? "text-[#3bddff]" : "text-[#ff4ba0]";

  return (
    <section className="space-y-[8px]">
      <div className={`overlay-title-font text-center text-[24px] leading-none tracking-[0.06em] ${titleClass}`}>
        {division.toUpperCase()}
      </div>

      <div className="space-y-[6px]">
        {entries.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-white/18 bg-black/10 px-4 py-5 text-center text-[12px] font-bold uppercase tracking-[0.24em] text-white/70">
            Awaiting finishers
          </div>
        ) : null}
        {entries.map((entry) => {
          const rankStyles =
            entry.place === 1
              ? "bg-gradient-to-r from-[#FCA728]/25 to-black/15 border-[#FCA728]/40 shadow-[0_0_15px_rgba(252,167,40,0.15)]"
              : entry.place === 2
                ? "bg-gradient-to-r from-[#D4DDE8]/24 to-black/15 border-[#C0CAD6]/36 shadow-[0_0_12px_rgba(212,221,232,0.12)]"
                : entry.place === 3
                  ? "bg-gradient-to-r from-[#D2774A]/25 to-black/15 border-[#D2774A]/30"
                  : "bg-black/12 border-white/8";
          const rankTextColor =
            entry.place === 1
              ? "#FFD447"
              : entry.place === 2
                ? "#DCE3EC"
                : entry.place === 3
                  ? "#F0B27A"
                  : "#FFFFFF";
          const outlinedRankTextStyle = {
            color: rankTextColor,
            textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
          } as const;

          return (
            <div
              key={entry.id}
              className={`grid grid-cols-[34px_minmax(0,1fr)_86px] items-center gap-3 rounded-[14px] border px-2 py-[7px] backdrop-blur-sm transition-all ${rankStyles}`}
            >
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-black/18">
                <div className="scale-[1.02]">
                  <MedalIcon place={entry.place} />
                </div>
              </div>
              <div className="flex items-baseline min-w-0 [text-shadow:0_2px_6px_rgba(0,0,0,0.55)]">
                <span
                  className="overlay-script-font mr-1 shrink-0 whitespace-nowrap text-[25px] leading-none"
                  style={outlinedRankTextStyle}
                >
                  {entry.bibNumber} -
                </span>
                <span
                  className="overlay-script-font whitespace-nowrap leading-none"
                  style={{
                    ...outlinedRankTextStyle,
                    fontSize:
                      entry.runnerName.length > 8
                        ? `${Math.max(10, 25 * (8 / entry.runnerName.length))}px`
                        : "25px",
                  }}
                >
                  {entry.runnerName}
                </span>
              </div>
              <div className="overlay-time-font justify-self-end text-right text-[15px] font-bold leading-none text-white whitespace-nowrap [text-shadow:0_2px_6px_rgba(0,0,0,0.55)]">
                {entry.finishTime}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AutoFitText({
  text,
  className,
  maxFontSize,
  minFontSize,
}: {
  text: string;
  className?: string;
  maxFontSize: number;
  minFontSize: number;
}) {
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    const element = textRef.current;
    if (!element) {
      return;
    }

    let frameId = 0;

    const fitText = () => {
      if (!element) {
        return;
      }

      let nextFontSize = maxFontSize;
      element.style.fontSize = `${nextFontSize}px`;

      while (nextFontSize > minFontSize && element.scrollWidth > element.clientWidth) {
        nextFontSize -= 0.5;
        element.style.fontSize = `${nextFontSize}px`;
      }

      setFontSize(nextFontSize);
    };

    const scheduleFit = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(fitText);
    };

    scheduleFit();

    const observer = new ResizeObserver(() => {
      scheduleFit();
    });
    observer.observe(element);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [maxFontSize, minFontSize, text]);

  return (
    <div
      ref={textRef}
      className={className}
      style={{ fontSize: `${fontSize}px` }}
    >
      {text}
    </div>
  );
}

function RecentDivisionPanel({
  division,
  entries,
}: {
  division: RaceDivision;
  entries: RecentDivisionFinisher[];
}) {
  const titleClass = division === "male" ? "text-[#3bddff]" : "text-[#ff4ba0]";
  const visibleEntries = entries.slice(-3);
  const historyEntries = visibleEntries.slice(0, -1);
  const latestEntry = visibleEntries.at(-1);

  return (
    <section
      className="flex flex-col rounded-[24px] border-[3px] border-white/85 bg-[linear-gradient(180deg,rgba(18,22,32,0.58)_0%,rgba(29,22,46,0.46)_100%)] px-3 py-3 text-white backdrop-blur-md shadow-2xl"
      style={{ minHeight: sy(196) }}
    >
      <div className={`overlay-title-font text-center text-[21px] leading-none ${titleClass}`}>
        {division.toUpperCase()}
      </div>
      <div className="mx-auto mt-3 h-[2px] rounded-full bg-white/16" style={{ width: "88%" }} />

      {entries.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-3 text-center text-[12px] font-bold uppercase tracking-[0.22em] text-white/72">
          No finishers yet
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {historyEntries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-[16px] border border-white/8 bg-black/14 px-2.5 py-2 text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.28)]"
          >
            <div className="flex items-end gap-1.5 whitespace-nowrap">
              <span className="overlay-time-font text-[15px] font-bold leading-none opacity-95">
                {entry.sequenceNumber}.
              </span>
              <span className="overlay-title-font text-[24px] leading-none">{entry.bibNumber}</span>
              <AutoFitText
                text={`- ${entry.runnerName}`}
                className="overlay-script-font min-w-0 flex-1 whitespace-nowrap leading-none"
                maxFontSize={17}
                minFontSize={8}
              />
            </div>
            <div className="pl-[28px] overlay-time-font text-[12px] font-bold leading-none text-white/92">
              {entry.finishTime}
            </div>
          </div>
        ))}
      </div>

      {latestEntry ? (
        <div className="mt-2 rounded-[20px] border border-white/16 bg-white/10 px-2 py-2 text-white [text-shadow:0_3px_8px_rgba(0,0,0,0.28)]">
          <div className="flex items-end gap-1.5 whitespace-nowrap">
            <span className="overlay-time-font text-[20px] font-bold leading-none text-white/96">
              {latestEntry.sequenceNumber}.
            </span>
            <span
              className="overlay-script-font text-[45px] leading-none text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, #4D16FF 0%, #7600D6 38%, #9D00A9 66%, #D10359 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                WebkitTextStroke: "1px #ffffff",
                filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.35))",
              }}
            >
              {latestEntry.bibNumber}
            </span>
          </div>

          <AutoFitText
            text={latestEntry.runnerName}
            className="overlay-script-font mt-1.5 w-full whitespace-nowrap px-1 text-center leading-[0.95] text-[#FFD447] [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]"
            maxFontSize={24}
            minFontSize={10}
          />

          <div className="mt-2 overlay-time-font text-center text-[18px] font-bold leading-none text-white/96">
            {latestEntry.finishTime}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function PublicDisplayScreen() {
  const camera = useCamera();
  const localTime = useLocalTime(10);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stageScale, setStageScale] = useState(1);
  const [displaySettings, setDisplaySettings] = useState(defaultDashboardSettings);
  const [publicFeed, setPublicFeed] = useState<PublicDisplayFeed>(createEmptyFeed);

  useEffect(() => {
    void camera.startCamera();
  }, [camera.startCamera]);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    if (camera.stream) {
      videoRef.current.srcObject = camera.stream;
      void videoRef.current.play().catch(() => null);
      return;
    }

    videoRef.current.srcObject = null;
  }, [camera.stream]);

  useEffect(() => {
    const updateScale = () => {
      const nextScale =
        Math.min(
          (window.innerWidth - 24) / STAGE_WIDTH,
          (window.innerHeight - 24) / STAGE_HEIGHT,
        ) * 0.99;

      setStageScale(Math.max(nextScale, 0.45));
    };

    updateScale();
    window.addEventListener("resize", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  useEffect(() => {
    const syncSettings = () => {
      setDisplaySettings(readDashboardSettings());
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === DASHBOARD_SETTINGS_STORAGE_KEY) {
        syncSettings();
      }
    };

    const handleSettingsUpdated = () => {
      syncSettings();
    };

    syncSettings();
    window.addEventListener("storage", handleStorage);
    window.addEventListener(DASHBOARD_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(DASHBOARD_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadFeed = async () => {
      try {
        const response = await fetch("/api/public-display", {
          cache: "no-store",
        });
        const nextFeed = (await response.json()) as PublicDisplayFeed;

        if (!isMounted) {
          return;
        }

        setPublicFeed(nextFeed);
      } catch {
        if (!isMounted) {
          return;
        }

        setPublicFeed((current) => ({
          ...current,
          error: "Unable to refresh workbook data.",
          updatedAt: new Date().toISOString(),
        }));
      }
    };

    void loadFeed();
    const intervalId = window.setInterval(() => {
      void loadFeed();
    }, 1000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const leaderboardByDivision = useMemo(
    () => ({
      male: buildLeaderboardEntries(
        publicFeed.finishers,
        "male",
        displaySettings.raceStartTimeIso,
      ),
      female: buildLeaderboardEntries(
        publicFeed.finishers,
        "female",
        displaySettings.raceStartTimeIso,
      ),
    }),
    [displaySettings.raceStartTimeIso, publicFeed.finishers],
  );

  const recentFinishersByDivision = useMemo(
    () => ({
      male: buildRecentFinishers(
        publicFeed.finishers,
        "male",
        displaySettings.raceStartTimeIso,
      ),
      female: buildRecentFinishers(
        publicFeed.finishers,
        "female",
        displaySettings.raceStartTimeIso,
      ),
    }),
    [displaySettings.raceStartTimeIso, publicFeed.finishers],
  );

  const startTimeLabel = useMemo(
    () => formatStartTime(displaySettings.raceStartTimeIso),
    [displaySettings.raceStartTimeIso],
  );
  const raceClock = useMemo(
    () =>
      formatRaceClock(
        getRaceClockReferenceTime(
          localTime,
          displaySettings.raceStatus,
          displaySettings.raceEndTimeIso,
        ),
        displaySettings.raceStartTimeIso,
      ),
    [
      displaySettings.raceEndTimeIso,
      displaySettings.raceStartTimeIso,
      displaySettings.raceStatus,
      localTime,
    ],
  );

  const stageFrameStyle = useMemo(
    () => ({
      width: `${STAGE_WIDTH * stageScale}px`,
      height: `${STAGE_HEIGHT * stageScale}px`,
    }),
    [stageScale],
  );

  const scaledStageStyle = useMemo(
    () => ({
      width: `${STAGE_WIDTH}px`,
      height: `${STAGE_HEIGHT}px`,
      transform: `scale(${stageScale})`,
      transformOrigin: "top left",
    }),
    [stageScale],
  );

  const layout = useMemo(() => {
    const stageRight = BASE_STAGE_WIDTH - 30;
    const gap = 30;
    const camera = {
      left: 20,
      top: 50,
      width: 900,
      height: 680,
    };
    const leaderboard = {
      left: camera.left + camera.width + gap,
      top: 55,
      width: stageRight - (camera.left + camera.width + gap),
      height: 492,
    };
    const recent = {
      left: leaderboard.left - 8,
      top: leaderboard.top + leaderboard.height + 1,
      width: leaderboard.width + 10,
    };
    const bottom = {
      left: camera.left,
      top: camera.top + camera.height + 10,
      width: camera.width,
    };

    return {
      camera,
      leaderboard,
      recent,
      bottom,
    };
  }, []);

  return (
    <div className="festival-display-background relative min-h-screen overflow-hidden">
      <main className="absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2"
          style={stageFrameStyle}
        >
          <div className="relative h-full w-full" style={scaledStageStyle}>
            <section
              className="absolute overflow-hidden rounded-[25px] bg-black border-[4px] border-white"
              style={{
                left: sx(layout.camera.left),
                top: sy(layout.camera.top),
                width: sx(layout.camera.width),
                height: sy(layout.camera.height),
              }}
              onClick={() => {
                if (!camera.stream) {
                  void camera.startCamera();
                }
              }}
            >
              {camera.stream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : null}

              <div
                className="absolute z-10 flex items-center gap-2 rounded-[20px] bg-[#E61D26] px-4 py-[6px] font-[Arial,sans-serif] text-[22px] font-bold tracking-[0.04em] text-white"
                style={{ left: sx(30), top: sy(25) }}
              >
                <span>LIVE</span>
                <span className="festival-live-dot h-[14px] w-[14px] rounded-full bg-white" />
              </div>
            </section>

            <div
              className="pointer-events-none absolute z-[15]"
              style={{ left: sx(260), top: sy(-40), width: sx(420) }}
            >
              <Image
                src={ccommunifestLogo}
                alt="CCO Communifest logo"
                className="h-auto w-full object-contain"
                priority
              />
            </div>

            <div
              className="pointer-events-none absolute z-[15]"
              style={{ left: sx(760), top: sy(50), width: sx(150) }}
            >
              <Image
                src={communityRunLogo}
                alt="Community Run logo"
                className="h-auto w-full object-contain"
                priority
              />
            </div>

            <aside
              className="absolute z-[5] flex flex-col overflow-hidden rounded-[24px] border-[3px] border-white/85 bg-[linear-gradient(180deg,rgba(18,22,32,0.58)_0%,rgba(29,22,46,0.46)_100%)] px-[20px] py-[18px] backdrop-blur-md shadow-2xl"
              style={{
                left: sx(layout.leaderboard.left),
                top: sy(layout.leaderboard.top),
                width: sx(layout.leaderboard.width),
                height: sy(layout.leaderboard.height),
              }}
            >
              <div className="overlay-title-font mb-[8px] flex items-center justify-center gap-[8px] text-[30px] leading-none text-white [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]">
                <div className="w-[72px]">
                  <Image src={leaderboardLogo} alt="Leaderboard Logo" className="h-auto w-full object-contain" />
                </div>
                <span className="flex items-baseline">
                  <span className="text-[60px]">L</span>EADERBOARD
                </span>
              </div>

              <div className="mx-auto mb-[8px] w-[90%] border-b border-white/12" />

              <LeaderboardSection division="male" entries={leaderboardByDivision.male} />

              <div className="mx-auto my-[8px] w-[90%] border-b border-white/10" />

              <LeaderboardSection division="female" entries={leaderboardByDivision.female} />

              <div className="mx-auto mt-[8px] w-[90%] border-b border-white/10" />
            </aside>

            <section
              className="absolute z-[5]"
              style={{
                left: sx(layout.recent.left),
                top: sy(layout.recent.top),
                width: sx(layout.recent.width),
              }}
            >
              <h2 className="overlay-title-font flex w-full items-baseline justify-center gap-1 text-center text-[26px] leading-none text-white [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]">
                <span className="text-[52px]">R</span>ECENT <span className="text-[50px] ml-5">F</span>INISHERS
              </h2>

              <div className="mt-0 grid grid-cols-2 gap-3">
                <RecentDivisionPanel
                  division="male"
                  entries={recentFinishersByDivision.male}
                />
                <RecentDivisionPanel
                  division="female"
                  entries={recentFinishersByDivision.female}
                />
              </div>
            </section>

            <section
              className="absolute z-[5] flex items-center justify-between"
              style={{
                left: sx(layout.bottom.left),
                top: sy(layout.bottom.top),
                width: sx(layout.bottom.width),
              }}
            >
              <div 
                className="flex flex-col items-center justify-center rounded-[24px] border-[3px] border-white/85 bg-gradient-to-br from-black/60 to-purple-900/40 px-0 py-5 backdrop-blur-md shadow-2xl"
                style={{ minWidth: sx(240), marginTop: sy(-16) }}
              >
                <div className="overlay-title-font mb-0 text-center text-[25px] tracking-[0.05em] text-[#01b4fe] [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]">
                  START TIME
                </div>
                <div className="overlay-digital-font flex items-center justify-center whitespace-nowrap text-[65px] font-bold leading-none text-white [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]">
                  {startTimeLabel}
                </div>
              </div>

              <div className="flex justify-center" style={{ width: sx(180) }}>
                <Image
                  src={runningLogo}
                  alt="Running art"
                  className="h-auto w-full object-contain"
                  priority
                />
              </div>

              <div 
                className="flex flex-col items-center justify-center rounded-[24px] border-[3px] border-white/85 bg-gradient-to-br from-black/60 to-purple-900/40 px-0 py-0 backdrop-blur-md shadow-2xl"
                style={{ minWidth: sx(430), paddingTop: sy(0), paddingBottom: sy(0), marginTop: sy(-16) }}
              >
                <div className="overlay-title-font mb-0 text-[30px] tracking-[0.05em] [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]">
                  <span className="text-[#fba202]">RACE</span>{" "}
                  <span className="text-[#85bd06]">TIME</span>
                </div>
                <div className="flex items-baseline justify-center text-[#ff2100] [text-shadow:-1px_-1px_0_#fff,1px_-1px_0_#fff,-1px_1px_0_#fff,1px_1px_0_#fff]"
                style={{ marginTop: sy(-10) }}
                >
                  <div className="overlay-digital-font flex items-baseline text-[99px] font-bold leading-none">
                    <DigitalDigits value={raceClock.hours} />
                    <span className="mx-1">:</span>
                    <DigitalDigits value={raceClock.minutes} />
                    <span className="mx-1">:</span>
                    <DigitalDigits value={raceClock.seconds} />
                  </div>
                </div>
                {displaySettings.raceStatus === "ended" ? (
                  <div className="mt-0 overlay-title-font text-[20px] leading-none text-white">
                    RUN ENDED
                  </div>
                ) : null}
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
