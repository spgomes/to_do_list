export interface List {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export const PASTEL_COLORS = [
  { id: 1, hex: "#F8BBD9", name: "Rosa" },
  { id: 2, hex: "#E1BEE7", name: "Lavanda" },
  { id: 3, hex: "#BBDEFB", name: "Azul" },
  { id: 4, hex: "#B2DFDB", name: "Menta" },
  { id: 5, hex: "#FFF9C4", name: "Amarelo" },
  { id: 6, hex: "#FFCCBC", name: "Pêssego" },
  { id: 7, hex: "#D1C4E9", name: "Lilás" },
  { id: 8, hex: "#B3E5FC", name: "Celeste" },
] as const;
