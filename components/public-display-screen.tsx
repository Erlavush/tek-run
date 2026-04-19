"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import ccommunifestLogo from "@/ccommunifest-logo.png";
import communityRunLogo from "@/community-run-logo.png";
import runningLogo from "@/running-logo.png";
import leaderboardLogo from "@/lb-logo.png";
import { useCamera } from "@/hooks/use-camera";
import { useLocalTime } from "@/hooks/use-local-time";
import {
  PUBLIC_DISPLAY_START_TIME_ISO,
  publicDisplayLatestRunners,
  publicDisplayLeaderboard,
} from "@/lib/mock-data";
import type { LeaderboardEntry, LatestRunnerCard, RaceDivision } from "@/lib/types";

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

const latestRunnerTitleStyle = {
  WebkitTextStroke: "1px white",
  textShadow:
    "1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 0 3px 0 rgba(0,0,0,0.2)",
} as const;

function formatStartTime(value: string) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(value));

  return formatted.replace("AM", "A.M.").replace("PM", "P.M.");
}

function formatRaceClock(value: Date | null) {
  if (!value) {
    return {
      hours: "--",
      minutes: "--",
      seconds: "--",
      centiseconds: "--",
    };
  }

  const startTime = new Date(PUBLIC_DISPLAY_START_TIME_ISO);
  const elapsedMs = Math.max(0, value.getTime() - startTime.getTime());
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  const centiseconds = Math.floor((elapsedMs % 1000) / 10)
    .toString()
    .padStart(2, "0");

  return {
    hours,
    minutes,
    seconds,
    centiseconds,
  };
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
  const titleClass = division === "male" ? "text-[#60A5FA]" : "text-[#F472B6]";

  return (
    <section className="space-y-[8px]">
      <div className={`overlay-title-font text-center text-[24px] leading-none tracking-[0.06em] ${titleClass}`}>
        {division.toUpperCase()}
      </div>

      <div className="space-y-[6px]">
        {entries.map((entry) => {
          const rankStyles =
            entry.place === 1
              ? "bg-gradient-to-r from-[#FCA728]/25 to-black/15 border-[#FCA728]/40 shadow-[0_0_15px_rgba(252,167,40,0.15)]"
              : entry.place === 2
                ? "bg-gradient-to-r from-[#E0E0E0]/20 to-black/15 border-[#E0E0E0]/30"
                : entry.place === 3
                  ? "bg-gradient-to-r from-[#D2774A]/25 to-black/15 border-[#D2774A]/30"
                  : "bg-black/12 border-white/8";

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
                <span className="overlay-script-font shrink-0 whitespace-nowrap text-[25px] leading-none text-white mr-1">
                  {entry.bibNumber} -
                </span>
                <span
                  className="overlay-script-font whitespace-nowrap leading-none text-white"
                  style={{
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

function LatestRunnerBox({ runner }: { runner: LatestRunnerCard }) {
  const titleClass = runner.division === "male" ? "text-[#60A5FA]" : "text-[#F472B6]";

  return (
    <div
      className="flex flex-col justify-between rounded-[20px] border-[2px] border-white/20 bg-gradient-to-br from-black/65 to-purple-900/45 px-4 py-3 backdrop-blur-md shadow-lg"
      style={{ width: sx(142), height: sy(126) }}
    >
      <div>
        <div className={`overlay-title-font text-center text-[14px] leading-none ${titleClass}`}>
          {runner.division.toUpperCase()}
        </div>
        <div className="mx-auto mt-2 w-[84%] border-t-[2px] border-white/20" />
      </div>

      <div className="text-center text-white">
        <div className="overlay-script-font text-[22px] leading-none">{runner.bibNumber}</div>
        <div className="overlay-script-font mt-2 text-[18px] leading-none">{runner.runnerName}</div>
      </div>

      <div className="overlay-time-font text-center text-[15px] font-bold leading-none text-white">
        {runner.finishTime}
      </div>
    </div>
  );
}

export function PublicDisplayScreen() {
  const camera = useCamera();
  const localTime = useLocalTime(10);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stageScale, setStageScale] = useState(1);

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

  const leaderboardByDivision = useMemo(
    () => ({
      male: publicDisplayLeaderboard.filter((entry) => entry.division === "male"),
      female: publicDisplayLeaderboard.filter((entry) => entry.division === "female"),
    }),
    [],
  );

  const startTimeLabel = useMemo(
    () => formatStartTime(PUBLIC_DISPLAY_START_TIME_ISO),
    [],
  );
  const raceClock = useMemo(() => formatRaceClock(localTime), [localTime]);

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

  return (
    <div className="festival-display-background relative min-h-screen overflow-hidden">
      <main className="absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={stageFrameStyle}
        >
          <div className="relative h-full w-full" style={scaledStageStyle}>
            <section
              className="absolute overflow-hidden rounded-[25px] bg-black"
              style={{
                left: sx(30),
                top: sy(50),
                width: sx(890),
                height: sy(640),
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
              style={{ left: sx(240), top: sy(-57), width: sx(470) }}
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
              className="absolute z-[5] flex flex-col overflow-hidden rounded-[24px] border-[2px] border-white/16 bg-[linear-gradient(180deg,rgba(18,22,32,0.58)_0%,rgba(29,22,46,0.46)_100%)] px-[20px] py-[18px] backdrop-blur-md shadow-2xl"
              style={{
                left: sx(950),
                top: sy(55),
                width: sx(300),
                height: sy(492),
              }}
            >
              <div className="overlay-title-font mb-[8px] flex items-center justify-center gap-[8px] text-[30px] leading-none text-white">
                <div className="w-[72px]">
                  <Image src={leaderboardLogo} alt="Leaderboard Logo" className="h-auto w-full object-contain" />
                </div>
                <span>LEADERBOARD</span>
              </div>

              <div className="mx-auto mb-[8px] w-[90%] border-b border-white/12" />

              <LeaderboardSection division="male" entries={leaderboardByDivision.male} />

              <div className="mx-auto my-[8px] w-[90%] border-b border-white/10" />

              <LeaderboardSection division="female" entries={leaderboardByDivision.female} />

              <div className="mx-auto mt-[8px] w-[90%] border-b border-white/10" />
            </aside>

            <section
              className="absolute z-[5]"
              style={{ left: sx(950), top: sy(560), width: sx(300) }}
            >
              <h2 className="overlay-title-font mb-0 w-full leading-none text-center text-[24px] text-white flex items-baseline justify-center gap-1">
                <span className="text-[52px]">R</span>ECENT <span className="text-[50px] ml-2">F</span>INISHERS
              </h2>

              <div className="flex justify-center gap-3">
                {publicDisplayLatestRunners.map((runner) => (
                  <LatestRunnerBox key={runner.id} runner={runner} />
                ))}
              </div>

              <div className="mt-0 flex justify-center">
                <div style={{ width: sx(300) }}>
                  <Image
                    src={runningLogo}
                    alt="Running art"
                    className="h-auto w-full object-contain"
                    priority
                  />
                </div>
              </div>
            </section>

            <section
              className="absolute z-[5] flex items-center justify-between"
              style={{
                left: sx(30),
                top: sy(695),
                width: sx(890),
                
              }}
            >
              <div 
                className="flex flex-col items-center justify-center rounded-[24px] border-[2px] border-white/20 bg-gradient-to-br from-black/60 to-purple-900/40 px-2 py-5 backdrop-blur-md shadow-2xl"
                style={{ minWidth: sx(300) }}
              >
                <div className="overlay-title-font mb-2 text-center text-[22px] tracking-[0.05em] text-[#01b4fe]">
                  START TIME
                </div>
                <div className="overlay-digital-font flex items-center justify-center text-[55px] font-bold leading-none text-white whitespace-nowrap">
                  {startTimeLabel}
                </div>
              </div>

              <div className="overlay-title-font text-[100px] leading-none text-white">
                -
              </div>

              <div 
                className="flex flex-col items-center justify-center rounded-[24px] border-[2px] border-white/20 bg-gradient-to-br from-black/60 to-purple-900/40 px-2 py-3 backdrop-blur-md shadow-2xl"
                style={{ minWidth: sx(500) }}
              >
                <div className="overlay-title-font mb-0 text-[22px] tracking-[0.05em]">
                  <span className="text-[#fba202]">RACE</span>{" "}
                  <span className="text-[#85bd06]">TIME</span>
                </div>
                 <div className="flex items-baseline justify-center text-[#FF3D44] [text-shadow:0_0_18px_rgba(255,61,68,0.2),-1px_-1px_0_#fff,1px_-1px_0_#fff,-1px_1px_0_#fff,1px_1px_0_#fff]">
                   <div className="overlay-digital-font flex items-baseline text-[112px] font-bold leading-none">
                     <DigitalDigits value={raceClock.hours} />
                     <span className="mx-1">:</span>
                     <DigitalDigits value={raceClock.minutes} />
                     <span className="mx-1">:</span>
                     <DigitalDigits value={raceClock.seconds} />
                   </div>
                   <div className="overlay-digital-font flex items-baseline ml-5 text-[82px] font-bold leading-none opacity-90">
                     <span className="mr-0">.</span>
                     <DigitalDigits value={raceClock.centiseconds} />
                   </div>
                 </div>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
