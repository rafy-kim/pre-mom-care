import { SignedIn, UserButton } from "@clerk/remix";
import { Link } from "@remix-run/react";

export function Header() {
  return (
    <header className="bg-light-gray p-4 flex justify-between items-center border-b">
      <Link to="/chat">
        <div className="flex items-center gap-2">
            <img src="/ansimi.png" alt="안심이 로고" className="h-8 w-8" />
            <span className="text-xl font-bold text-dark-gray">예비맘, 안심 톡</span>
        </div>
      </Link>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </header>
  );
} 