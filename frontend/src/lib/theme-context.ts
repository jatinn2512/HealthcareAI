import { createContext, type Dispatch, type SetStateAction } from "react";

export type Theme = "light" | "dark";

export interface ThemeContextValue {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  toggleTheme: () => void;
}

export const STORAGE_KEY = "health-companion-theme";
export const ThemeContext = createContext<ThemeContextValue | null>(null);
