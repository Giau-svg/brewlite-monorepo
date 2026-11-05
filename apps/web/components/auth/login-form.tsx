"use client";

import { useState, type FormEvent } from "react";
import "./login-form.css";
import Link from "next/link";

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      {hidden && <path d="M3 3 21 21" />}
    </svg>
  );
}

function Brand({ onDark = false }: { onDark?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-3 lg:justify-start">
      <div className={`flex h-14 w-14 items-center justify-center rounded-full ${onDark ? "bg-[#8D6549]" : "bg-[#EFE5D8]"}`}>
        <span aria-hidden="true" className="text-3xl">☕</span>
      </div>
      <span className={`text-3xl font-bold tracking-tight ${onDark ? "text-white" : "text-[#67432D]"}`}>
        BrewLite
      </span>
    </div>
  );
}

export default function LoginForm() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!/^0\d{9}$/.test(phone.trim())) {
      setMessage("Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số, bắt đầu bằng 0.");
      return;
    }
    if (!password) {
      setMessage("Vui lòng nhập mật khẩu.");
      return;
    }

    // TODO: Kết nối POST /auth/login sau khi Backend thống nhất API.
    // Không lưu mật khẩu/token hoặc thông báo đăng nhập thành công giả.
    setMessage("Giao diện đã sẵn sàng. Chức năng đăng nhập chưa kết nối máy chủ.");
  }

  return (
    <main className="min-h-screen bg-[#F8F5F0] text-[#32251D] lg:grid lg:grid-cols-[45%_55%]">
      <aside className="hidden min-h-screen flex-col justify-center bg-[#67432D] px-[10%] text-white lg:flex">
        <div className="max-w-lg">
          <Brand onDark />
          <h1 className="mt-16 text-[clamp(1.7rem,3vw,3rem)] font-bold leading-[1.35] tracking-tight">
            <span className="block whitespace-nowrap">Một ly cà phê,</span>
            <span className="block whitespace-nowrap">một khoảnh khắc</span>
            <span className="block whitespace-nowrap">thư giãn.</span>
          </h1>
          <p className="mt-7 text-lg leading-8 text-[#E8D7C7]">
          Chọn món yêu thích của bạn và tận hưởng trải nghiệm đặt{" "}
          <span className="whitespace-nowrap">cà phê</span> thật đơn giản.
          </p>
          <div aria-hidden="true" className="mt-20 space-y-3">
            <div className="h-3 w-72 max-w-full rounded-full bg-[#A87D5E]" />
            <div className="h-3 w-52 max-w-full rounded-full bg-[#A87D5E]" />
          </div>
        </div>
      </aside>

      <section className="flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="mb-12 lg:hidden"><Brand /></div>

        <div className="w-full max-w-[472px] rounded-3xl bg-white px-6 py-9 shadow-sm sm:px-10 sm:py-12">
          <div className="mb-11 hidden lg:block"><Brand /></div>
          <h2 className="text-center text-2xl font-bold sm:text-[27px]">Chào mừng trở lại!</h2>
          <p className="mt-3 text-center text-sm text-[#87776B]">
            Đăng nhập để tiếp tục trải nghiệm BrewLite
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-9 space-y-6">
            <div>
              <label htmlFor="login-phone" className="mb-2 block text-sm font-medium">Số điện thoại</label>
              <input
                id="login-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(event) => { setPhone(event.target.value); setMessage(""); }}
                placeholder="Nhập số điện thoại"
                maxLength={15}
                required
                className="h-[52px] w-full rounded-xl border border-[#DED3C8] bg-white px-4 text-sm text-[#32251D] outline-none placeholder:text-[#A79C90] focus:border-[#67432D] focus:ring-2 focus:ring-[#67432D]/15"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-2 block text-sm font-medium">Mật khẩu</label>
              <div className="flex h-[52px] items-center rounded-xl border border-[#DED3C8] bg-white focus-within:border-[#67432D] focus-within:ring-2 focus-within:ring-[#67432D]/15">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); setMessage(""); }}
                  placeholder="Nhập mật khẩu"
                  required
                  className="brewlite-password-input h-full min-w-0 flex-1 bg-transparent px-4 text-sm text-[#32251D] outline-none placeholder:text-[#A79C90]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showPassword}
                  className="flex h-full w-12 shrink-0 items-center justify-center text-[#67432D] hover:text-[#32251D] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#67432D]"
                >
                  <EyeIcon hidden={showPassword} />
                </button>
              </div>
            </div>

            {message && (
              <p role="status" aria-live="polite" className="rounded-lg bg-[#F8F5F0] px-3 py-2 text-sm text-[#67432D]">
                {message}
              </p>
            )}

            <button
              type="submit"
              className="h-[52px] w-full rounded-xl bg-[#67432D] text-sm font-semibold text-white transition-colors hover:bg-[#543622] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67432D]"
            >
              Đăng nhập
            </button>
          </form>

          
          <p className="mt-6 text-center text-sm text-[#87776B]">
            Chưa có tài khoản?{" "}
            <span className="font-semibold text-[#67432D]">
              Đăng ký ngay
            </span>
          </p>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-[#67432D] hover:underline"
            >
              ← Về trang chủ
            </Link>
          </div>
        </div>

        <p className="mt-10 max-w-md text-center text-xs leading-5 text-[#87776B]">
          Bạn có thể xem thực đơn mà không cần đăng nhập. Khi xác nhận đặt món, hệ thống sẽ yêu cầu đăng nhập nếu cần.
        </p>
      </section>
    </main>
  );
}
