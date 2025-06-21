"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner";

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    (<Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        style: {
          fontSize: '15px',
          lineHeight: '1.2',
          padding: '12px 20px',
          minHeight: '40px',
        },
        className: 'text-[15px]',
      }}
      style={
        {
          "--normal-bg": "rgb(148, 82, 255)",
          "--normal-text": "#ffffff",
          "--normal-border": "transparent",
          "--shadow": "0 4px 12px rgba(0, 0, 0, 0.15)",
          "--font-size": "15px",
          "--description-font-size": "15px",
          "--description-font-weight": "normal"
        }
      }
      {...props} />)
  );
}

export { Toaster }
