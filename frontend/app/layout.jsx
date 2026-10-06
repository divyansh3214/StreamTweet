import "./globals.css";

export const metadata = {
  title: "StreamTweet — Your world, in motion",
  description: "A little bit of everything you love. Find your people on StreamTweet.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
