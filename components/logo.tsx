import Image from "next/image";
import Link from "next/link";

/** Full horizontal lockup from the supplied brand file. Use the mark alone below 120px wide. */
export function Logo({ href = "/", height = 40 }: { href?: string; height?: number }) {
  const width = Math.round((height * 754) / 298);
  return (
    <Link href={href} className="inline-flex shrink-0 items-center" aria-label="Funding Lab home">
      <Image src="/brand/funding-lab-logo.png" alt="Funding Lab" width={width} height={height} priority />
    </Link>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return <Image src="/brand/funding-lab-mark.png" alt="" width={size} height={size} aria-hidden />;
}
