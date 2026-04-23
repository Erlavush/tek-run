"use client";

import { useEffect, useState } from "react";

export type CameraPermissionState = "granted" | "prompt" | "denied" | "unsupported" | "unknown";

export function useCameraPermission() {
  const [permission, setPermission] = useState<CameraPermissionState>("unknown");

  useEffect(() => {
    if (!navigator.permissions?.query) {
      setPermission("unsupported");
      return;
    }

    let active = true;
    let permissionStatus: PermissionStatus | null = null;

    const syncPermission = () => {
      if (!active || !permissionStatus) {
        return;
      }

      if (
        permissionStatus.state === "granted" ||
        permissionStatus.state === "prompt" ||
        permissionStatus.state === "denied"
      ) {
        setPermission(permissionStatus.state);
        return;
      }

      setPermission("unknown");
    };

    void navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((nextPermissionStatus) => {
        permissionStatus = nextPermissionStatus;
        syncPermission();
        permissionStatus.addEventListener?.("change", syncPermission);
      })
      .catch(() => {
        if (active) {
          setPermission("unknown");
        }
      });

    return () => {
      active = false;
      permissionStatus?.removeEventListener?.("change", syncPermission);
    };
  }, []);

  return permission;
}
