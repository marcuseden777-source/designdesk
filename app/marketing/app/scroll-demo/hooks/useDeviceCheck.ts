"use client";

import { useEffect, useState } from "react";

export interface DeviceCheckResult {
  /** False until the client-side check has run (SSR-safe). */
  ready: boolean;
  /** True when the WebP/CSS fallback should replace the WebGL experience. */
  useFallback: boolean;
  /** True when viewport is below the 768px breakpoint. */
  isMobile: boolean;
}

interface NetworkInformation {
  effectiveType?: string;
}

/**
 * Decides whether the device gets the full WebGL scroll experience or the
 * lightweight CSS scroll-snap fallback. Fallback triggers when:
 *  - WebGL context creation fails, OR
 *  - screen < 640px AND connection is 2g / slow-2g
 */
export function useDeviceCheck(): DeviceCheckResult {
  const [result, setResult] = useState<DeviceCheckResult>({
    ready: false,
    useFallback: false,
    isMobile: false,
  });

  useEffect(() => {
    let webglOk = false;
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      webglOk = Boolean(gl);
    } catch {
      webglOk = false;
    }

    const connection = (
      navigator as Navigator & { connection?: NetworkInformation }
    ).connection;
    const slowConnection =
      connection?.effectiveType === "2g" ||
      connection?.effectiveType === "slow-2g";

    const smallScreen = window.innerWidth < 640;
    const isMobile = window.innerWidth < 768;

    setResult({
      ready: true,
      useFallback: !webglOk || (smallScreen && slowConnection),
      isMobile,
    });
  }, []);

  return result;
}
