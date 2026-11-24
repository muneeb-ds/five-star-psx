import "./globals.css";
import Link from "next/link";
export const metadata = { title: "PSX Five-Star Shariah Tracker", description: "Non-financial PSX companies with the top five-star Shariah rating, and how the list changes at each PSX review." };
export default function Root({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>
    <nav><Link href="/">Five-star list</Link><Link href="/changes">What changed</Link><Link href="/reviews">Reviews</Link><Link href="/health">Sources &amp; health</Link></nav>
    <main>{children}</main>
    <footer className="mut" style={{maxWidth:1000,margin:"0 auto",padding:16,fontSize:13}}>Information only, not investment or religious advice. Ratings come from PSX notices; market data is delayed.</footer>
  </body></html>);
}
