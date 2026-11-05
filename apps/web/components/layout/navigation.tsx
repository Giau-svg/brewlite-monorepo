
import Link from "next/link";

export function Navigation() {
  return (
    <nav className="flex items-center gap-6 text-sm">
      <Link href="/#menu" className="hover:text-amber-700">
        Menu
      </Link>

      <Link href="/#about" className="hover:text-amber-700">
        Về chúng tôi
      </Link>

      <Link
        href="/login"
        className="rounded-full bg-[#67432D] px-5 py-2.5 font-semibold text-white transition-colors hover:bg-[#523521]"
      >
        Đăng nhập
      </Link>
    </nav>
  );
}
