import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "./providers";

const baijamjuree = localFont({
  src: [
    {
      path: "./fonts/BaiJamjuree-ExtraLight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "./fonts/BaiJamjuree-ExtraLightItalic.ttf",
      weight: "200",
      style: "italic",
    },
    {
      path: "./fonts/BaiJamjuree-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/BaiJamjuree-LightItalic.ttf",
      weight: "300",
      style: "italic",
    },
    {
      path: "./fonts/BaiJamjuree-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/BaiJamjuree-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/BaiJamjuree-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/BaiJamjuree-MediumItalic.ttf",
      weight: "500",
      style: "italic",
    },
    {
      path: "./fonts/BaiJamjuree-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/BaiJamjuree-SemiBoldItalic.ttf",
      weight: "600",
      style: "italic",
    },
    {
      path: "./fonts/BaiJamjuree-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/BaiJamjuree-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
});

export const metadata: Metadata = {
  title: "Mais um Item - Admin",
  description: "Console de configuração",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className={`${baijamjuree.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
