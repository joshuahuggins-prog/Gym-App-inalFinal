import { useEffect, useState } from "react";

export default function useUpsideDown() {
  const [upsideDown, setUpsideDown] = useState(false);

  useEffect(() => {
    const readAngle = () => {
      // Android Chrome / Samsung Internet
      if (window.screen?.orientation?.angle != null) {
        return window.screen.orientation.angle;
      }

      // Older fallback
      if (typeof window.orientation === "number") {
        return window.orientation;
      }

      return 0;
    };

    const update = () => {
      const angle = Number(readAngle());
      setUpsideDown(angle === 180);
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