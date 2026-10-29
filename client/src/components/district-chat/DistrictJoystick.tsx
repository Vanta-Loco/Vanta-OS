import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { projectDistrictJoystick, type DistrictJoystickProjection } from "@/lib/district-joystick";

export interface DistrictJoystickInput {
  x: number;
  y: number;
  magnitude: number;
}

interface DistrictJoystickProps {
  disabled?: boolean;
  onChange(input: DistrictJoystickInput): void;
}

const NEUTRAL: DistrictJoystickInput = { x: 0, y: 0, magnitude: 0 };

export function DistrictJoystick({ disabled = false, onChange }: DistrictJoystickProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointerIdRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const radiusRef = useRef(38);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const reset = useCallback(() => {
    pointerIdRef.current = null;
    setOffset({ x: 0, y: 0 });
    onChangeRef.current(NEUTRAL);
  }, []);

  useEffect(() => {
    const onBlur = () => reset();
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("blur", onBlur);
      reset();
    };
  }, [reset]);

  useEffect(() => {
    if (disabled) reset();
  }, [disabled, reset]);

  const publishProjection = useCallback((projection: DistrictJoystickProjection) => {
    setOffset({ x: projection.offsetX, y: projection.offsetY });
    onChangeRef.current({
      x: projection.x,
      y: projection.y,
      magnitude: projection.magnitude,
    });
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled || pointerIdRef.current !== null) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    pointerIdRef.current = event.pointerId;
    centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    radiusRef.current = Math.max(1, Math.min(rect.width, rect.height) * 0.3);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      reset();
      return;
    }
    const projection = projectDistrictJoystick(
      event.clientX - centerRef.current.x,
      event.clientY - centerRef.current.y,
      radiusRef.current,
    );
    publishProjection(projection);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled || pointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    publishProjection(projectDistrictJoystick(
      event.clientX - centerRef.current.x,
      event.clientY - centerRef.current.y,
      radiusRef.current,
    ));
  };

  const finishPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    reset();
  };

  const style = {
    "--stick-x": `${offset.x}px`,
    "--stick-y": `${offset.y}px`,
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`vanta-city-joystick${pointerIdRef.current !== null ? " is-active" : ""}`}
      style={style}
      data-district-touch-controls=""
      aria-label="Movement joystick. Drag to steer and move. Keyboard alternative: WASD or arrow keys."
      aria-disabled={disabled}
      disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onLostPointerCapture={finishPointer}
    >
      <span className="vanta-city-joystick__thumb" aria-hidden="true">+</span>
      <span className="vanta-city-joystick__hint" aria-hidden="true">DRAG TO MOVE · WASD</span>
    </button>
  );
}

export default DistrictJoystick;
