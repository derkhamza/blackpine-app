import { useState, useCallback } from "react";
/**
 * Manages the show/hide state of a native date picker, abstracting
 * the iOS vs Android difference. Returns:
 * - `pickerProps`: spread onto <DateTimePicker> when shown
 * - `show()`: opens the picker for a given current value and on-pick callback
 * - `isVisible`: whether the picker should be rendered
 */
export function useDatePicker() {
  const [state, setState] = useState<{
    visible: boolean;
    value: Date;
    onPick: (d: Date) => void;
  } | null>(null);

  const show = useCallback((currentISO: string, onPick: (iso: string) => void) => {
    setState({
      visible: true,
      value: new Date(currentISO),
      onPick: (d) => onPick(d.toISOString().split("T")[0]),
    });
  }, []);

  const hide = useCallback(() => setState(null), []);

const { Platform } = require("react-native");
  const pickerProps = state
    ? {
        value: state.value,
        mode: "date" as const,
        display: Platform.OS === "ios" ? ("spinner" as const) : ("default" as const),
        maximumDate: new Date(),
        onChange: (_: unknown, selected?: Date) => {
          if (Platform.OS !== "ios") hide();
          if (selected) state.onPick(selected);
        },
      }
    : null;

  return {
    isVisible: state?.visible ?? false,
    pickerProps,
    show,
    hide,
  };
}