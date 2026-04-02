import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  styles: {
    global: {
      body: {
        bg: "#f6f8fb",
        color: "#1f2937",
      },
    },
  },
  fonts: {
    heading: "var(--font-geist-sans), 'SF Pro Display', 'Segoe UI', sans-serif",
    body: "var(--font-geist-sans), 'SF Pro Text', 'Segoe UI', sans-serif",
  },
  colors: {
    brand: {
      50: "#eef5ff",
      100: "#d8e8ff",
      200: "#b3d1ff",
      300: "#80b1ff",
      400: "#4f8eff",
      500: "#2f6fff",
      600: "#2458db",
      700: "#1e46ac",
      800: "#1d3d86",
      900: "#1d356e",
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 600,
        borderRadius: "12px",
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: "18px",
          border: "1px solid",
          borderColor: "blackAlpha.100",
          boxShadow: "0 8px 30px rgba(16, 24, 40, 0.05)",
        },
      },
    },
  },
});

export default theme;
