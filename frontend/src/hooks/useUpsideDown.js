import { useEffect, useState } from "react";

export default function useUpsideDown() {
  const [upsideDown, setUpsideDown] = useState(false);

  useEffect(() => {
    const readAngle = () => {
      // Modern Android browsers
      if (window.screen?.orientation?.angle != null) {
        return window.screen.orientation.angle;
      }

      // Legacy fallback
      if (typeof window.orientation === "number") {
        return window.orientation;
      }

      return 0;
    };

    const update = () => {
      const angle = Number(readAngle());

      // ✅ Tolerance window avoids jitter (150–210 ≈ upside-down portrait)
      const isUpsideDown = angle > 150 && angle < 210;

      setUpsideDown((prev) =>
        prev !== isUpsideDown ? isUpsideDown : prev
      );
    };

    update();

    window.addEventListener("orientationchange", update);
    window.screen?.orientation?.addEventListener?.("change", update);

    return () => {
      window.removeEventListener("orientationchange", update);
      window.screen?.orientation?.removeEventListener?.("change", update);
    };
  }, []);

  return upsideDown;
}