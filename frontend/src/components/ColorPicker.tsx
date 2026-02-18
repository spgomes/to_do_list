import { PASTEL_COLORS } from "../types/list";

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

export function ColorPicker({
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: ColorPickerProps) {
  return (
    <div
      className="color-picker"
      role="group"
      aria-label={ariaLabel ?? "Seletor de cores pastéis"}
    >
      <div className="color-picker-grid" role="radiogroup">
        {PASTEL_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`color-picker-option ${value === c.hex ? "selected" : ""}`}
            style={{ backgroundColor: c.hex }}
            onClick={() => !disabled && onChange(c.hex)}
            disabled={disabled}
            aria-label={`Cor ${c.name}`}
            aria-pressed={value === c.hex}
            title={c.name}
          />
        ))}
      </div>
    </div>
  );
}
