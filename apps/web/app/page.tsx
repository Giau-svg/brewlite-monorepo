import { Header } from "../components/layout/header";
import { Footer } from "../components/layout/footer";
import { MenuCatalog } from "../components/menu/menu-catalog";

export default function Home() {

  return (
    <main className="min-h-screen bg-[#faf7f2] text-stone-900">
      <Header />

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:px-12 md:py-24">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
            Cà phê mỗi ngày
          </p>

          <h2 className="text-5xl font-bold leading-tight md:text-6xl">
            Một chút cà phê,
            <br />
            một ngày tuyệt vời.
          </h2>

          <p className="mt-6 max-w-md leading-7 text-stone-600">
            Khám phá những thức uống yêu thích và đặt món
            dễ dàng cùng BrewLite.
          </p>

          <a
            href="#menu"
            className="mt-8 inline-block rounded-full bg-stone-900 px-7 py-3 font-medium text-white hover:bg-amber-900"
          >
            Khám phá menu
          </a>
        </div>

        <div className="flex min-h-72 items-center justify-center rounded-3xl bg-[#e9ddcc] p-8">
          <div className="text-center">
            <div className="text-8xl">☕</div>
            <p className="mt-4 text-xl font-semibold">
              Your daily coffee
            </p>
            <p className="mt-2 text-stone-600">
              Fresh · Simple · Delicious
            </p>
          </div>
        </div>
      </section>

      <MenuCatalog />

      <Footer />
    </main>
  );
}
