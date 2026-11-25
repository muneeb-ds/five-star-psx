import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/hanken-grotesk";
import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: { default: "Five-star PSX", template: "%s | Five-star PSX" },
  description: "Non-financial Pakistan Stock Exchange companies with the top five-star Shariah rating, and how that list changes at each PSX review.",
};

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <div className="wrap">
            <Link href="/" className="brand"><i aria-hidden>★</i>Five-star PSX</Link>
            <nav aria-label="Main">
              <Link href="/">Companies</Link>
              <Link href="/changes">What changed</Link>
              <Link href="/reviews">Reviews</Link>
              <Link href="/health">Data health</Link>
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="foot"><div className="wrap">Ratings come from PSX notices. Market data is delayed and some shares trade rarely, so prices can be old. This site gives information, not investment or religious advice.</div></footer>
      </body>
    </html>
  );
}
