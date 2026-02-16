// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TagsManager } from "../TagsManager";
import type { Tag } from "../../types/tag";

const tags: Tag[] = [
  { id: 1, name: "work", created_at: "2025-01-01" },
  { id: 2, name: "home", created_at: "2025-01-02" },
];

describe("TagsManager", () => {
  it("renders title and create form", () => {
    render(
      <TagsManager
        tags={[]}
        onCreateTag={vi.fn()}
        onUpdateTag={vi.fn()}
        onDeleteTag={vi.fn()}
        error={null}
        onClearError={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { name: /gerenciar tags/i })
    ).toBeDefined();
    expect(
      screen.getByRole("textbox", { name: /nome da nova tag/i })
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /criar tag/i })).toBeDefined();
  });

  it("renders list of tags with edit and remove buttons", () => {
    render(
      <TagsManager
        tags={tags}
        onCreateTag={vi.fn()}
        onUpdateTag={vi.fn()}
        onDeleteTag={vi.fn()}
        error={null}
        onClearError={vi.fn()}
      />
    );

    expect(screen.getByText("work")).toBeDefined();
    expect(screen.getByText("home")).toBeDefined();
    expect(
      screen.getByRole("button", { name: /editar tag work/i })
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /remover tag work/i })
    ).toBeDefined();
  });

  it("calls onCreateTag with trimmed name when form is submitted", async () => {
    const user = userEvent.setup();
    const onCreateTag = vi.fn().mockResolvedValue(undefined);

    render(
      <TagsManager
        tags={[]}
        onCreateTag={onCreateTag}
        onUpdateTag={vi.fn()}
        onDeleteTag={vi.fn()}
        error={null}
        onClearError={vi.fn()}
      />
    );

    await user.type(
      screen.getByRole("textbox", { name: /nome da nova tag/i }),
      "  newtag  "
    );
    await user.click(screen.getByRole("button", { name: /criar tag/i }));

    expect(onCreateTag).toHaveBeenCalledWith("newtag");
  });

  it("displays error when error prop is set", () => {
    render(
      <TagsManager
        tags={[]}
        onCreateTag={vi.fn()}
        onUpdateTag={vi.fn()}
        onDeleteTag={vi.fn()}
        error="tag with this name already exists"
        onClearError={vi.fn()}
      />
    );

    expect(screen.getByRole("alert")).toBeDefined();
    expect(
      screen.getByText("tag with this name already exists")
    ).toBeDefined();
  });

  it("shows empty message when no tags", () => {
    render(
      <TagsManager
        tags={[]}
        onCreateTag={vi.fn()}
        onUpdateTag={vi.fn()}
        onDeleteTag={vi.fn()}
        error={null}
        onClearError={vi.fn()}
      />
    );

    expect(screen.getByText(/nenhuma tag cadastrada/i)).toBeDefined();
  });
});
