"use client";

import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass, themeModeOptions } from "@/lib/theme";
import type { DashboardSettings, VideoInputOption } from "@/lib/types";

interface SettingsPanelProps {
  devices: VideoInputOption[];
  isOpen: boolean;
  onCameraSourceChange: (value: string) => void;
  onClose: () => void;
  onSettingChange: <K extends keyof DashboardSettings>(
    key: K,
    value: DashboardSettings[K],
  ) => void;
  settings: DashboardSettings;
}

function ToggleField({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-[24px] bg-[#F7F7F7] px-4 py-4 ring-1 ring-[#1F1F1F]/6">
      <div>
        <p className="text-sm font-bold text-[#1F1F1F]">{label}</p>
        <p className="mt-1 text-sm font-medium text-[#615A66]">{description}</p>
      </div>
      <button
        type="button"
        aria-pressed={checked}
        className={`relative h-8 w-14 rounded-full transition ${
          checked ? "bg-gradient-to-r from-[#4C05E4] to-[#A00063]" : "bg-[#DADADA]"
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
            checked ? "left-7" : "left-1"
          }`}
        />
      </button>
    </label>
  );
}

export function SettingsPanel({
  devices,
  isOpen,
  onCameraSourceChange,
  onClose,
  onSettingChange,
  settings,
}: SettingsPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#1F1F1F]/42 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl p-4 lg:p-6">
        <div className="panel-card flex h-full flex-col p-6 lg:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7701A6]">
                Dashboard Settings
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-[#1F1F1F]">
                Session Controls
              </h2>
              <p className="mt-2 max-w-xl text-sm font-medium text-[#615A66]">
                Configure event labels, camera source, and operator preferences. These
                settings currently persist in browser storage and are ready to move into
                a backend config service later.
              </p>
            </div>

            <button
              type="button"
              className={secondaryButtonClass}
              onClick={onClose}
            >
              Close
            </button>
          </div>

          <div className="scrollbar-slim flex-1 space-y-5 overflow-auto pr-2">
            <div>
              <label className={labelClass} htmlFor="settings-event-name">
                Event Name
              </label>
              <input
                id="settings-event-name"
                className={inputClass}
                value={settings.eventName}
                onChange={(event) => onSettingChange("eventName", event.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="settings-finish-line-label">
                Finish Line Label
              </label>
              <input
                id="settings-finish-line-label"
                className={inputClass}
                value={settings.finishLineLabel}
                onChange={(event) =>
                  onSettingChange("finishLineLabel", event.target.value)
                }
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="settings-camera-source">
                Camera Source
              </label>
              <select
                id="settings-camera-source"
                className={inputClass}
                value={settings.cameraSource}
                onChange={(event) => onCameraSourceChange(event.target.value)}
              >
                {devices.length === 0 ? (
                  <option value="">No detected camera devices</option>
                ) : (
                  devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="settings-theme-mode">
                Theme Mode
              </label>
              <select
                id="settings-theme-mode"
                className={inputClass}
                value={settings.themeMode}
                onChange={(event) =>
                  onSettingChange("themeMode", event.target.value as DashboardSettings["themeMode"])
                }
              >
                {themeModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} — {option.description}
                  </option>
                ))}
              </select>
            </div>

            <ToggleField
              checked={settings.autoScrollResults}
              description="Keeps the newest finisher row in view as mock entries are appended."
              label="Auto-scroll Results"
              onChange={(value) => onSettingChange("autoScrollResults", value)}
            />

            <ToggleField
              checked={settings.soundAlert}
              description="Uses browser vibration support when available to simulate race alerts."
              label="Sound Alert"
              onChange={(value) => onSettingChange("soundAlert", value)}
            />

            <ToggleField
              checked={settings.mockMode}
              description="Keeps the app in frontend-only mode with seeded race data."
              label="Mock Mode"
              onChange={(value) => onSettingChange("mockMode", value)}
            />
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button type="button" className={secondaryButtonClass} onClick={onClose}>
              Cancel
            </button>
            <button type="button" className={primaryButtonClass} onClick={onClose}>
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
