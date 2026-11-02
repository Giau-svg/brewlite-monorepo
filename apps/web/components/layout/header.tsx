import { Navigation } from "./navigation";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-stone-200 px-6 py-5 md:px-16">
      <h1 className="text-2xl font-bold tracking-tight">
        BrewLite<span className="text-amber-700">.</span>
      </h1>

      <Navigation />
    </header>
  );
}
