import type { List } from "../types/list";

interface ListChipProps {
  list: List;
  onRemove?: (listId: number) => void;
  "aria-label"?: string;
}

export function ListChip({ list, onRemove, "aria-label": ariaLabel }: ListChipProps) {
  return (
    <span
      className="tag-chip"
      role="listitem"
      aria-label={ariaLabel ?? `Lista: ${list.name}`}
      style={{ backgroundColor: list.color }}
    >
      <span className="tag-chip-name">{list.name}</span>
      {onRemove && (
        <button
          type="button"
          className="tag-chip-remove"
          onClick={() => onRemove(list.id)}
          aria-label={`Remover lista ${list.name}`}
          title={`Remover lista ${list.name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
