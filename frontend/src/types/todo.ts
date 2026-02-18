import type { List } from "./list";

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
  lists?: List[];
}
