import Link from "next/link";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/theme";

export function TopBar() {
  return (
    <header className="panel-card px-4 py-4 lg:px-5">
      <div className="flex flex-wrap gap-3">
        <Link href="/manual-entry" className={primaryButtonClass}>
          Manual
        </Link>
        <Link href="/review" className={secondaryButtonClass}>
          Review
        </Link>
        <Link href="/public-display" target="_blank" className={secondaryButtonClass}>
          Public
        </Link>
      </div>
    </header>
  );
}
