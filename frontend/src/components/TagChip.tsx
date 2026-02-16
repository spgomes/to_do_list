import type { Tag } from "../types/tag";

interface TagChipProps {
  tag: Tag;
  onRemove?: (tagId: number) => void;
  "aria-label"?: string;
}

export function TagChip({ tag, onRemove, "aria-label": ariaLabel }: TagChipProps) {
  return (
    <span
      className="tag-chip"
      role="listitem"
      aria-label={ariaLabel ?? `Tag: ${tag.name}`}
    >
      <span className="tag-chip-name">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          className="tag-chip-remove"
          onClick={() => onRemove(tag.id)}
          aria-label={`Remover tag ${tag.name}`}
          title={`Remover tag ${tag.name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
