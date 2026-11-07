"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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

export default function LoginForm({ onClose, initialMode = "login" }: { onClose?: () => void; initialMode?: "login" | "register" } = {}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!onClose) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; };
  }, [onClose]);
  const [mode, setMode] = useState(initialMode);
  const [fullName, setFullName] = useState("");
  const isRegister = mode === "register";
  function switchMode() { setMode(isRegister ? "login" : "register"); setPassword(""); setShowPassword(false); setMessage(""); }
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (isRegister && !fullName.trim()) { setMessage("Vui lòng nhập họ và tên."); return; }
    if (!/^0\d{9}$/.test(phone.trim())) {
      setMessage("Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số, bắt đầu bằng 0.");
      return;
    }
    if (!password) {
      setMessage("Vui lòng nhập mật khẩu.");
      return;
    }

    if (isRegister) {
      if (password.length < 15) { setMessage("Mật khẩu cần ít nhất 15 ký tự."); return; }
      setMessage("Đăng ký và xác minh OTP chưa kết nối máy chủ. Chưa có tài khoản nào được tạo.");
      return;
    }
    // TODO: Kết nối POST /auth/login sau khi Backend thống nhất API.
    // Không lưu mật khẩu/token hoặc thông báo đăng nhập thành công giả.
    setMessage("Giao diện đã sẵn sàng. Chức năng đăng nhập chưa kết nối máy chủ.");
  }

  const card = (
      <section className="bl-auth-card" aria-labelledby="login-title">
        {onClose ? <button type="button" className="bl-auth-close" onClick={onClose} aria-label={isRegister ? "Đóng đăng ký" : "Đóng đăng nhập"}>×</button> : <Link href="/" className="bl-auth-close" aria-label="Đóng đăng nhập, về trang chủ">×</Link>}
        <h1 id="login-title">{isRegister ? "ĐĂNG KÝ" : "ĐĂNG NHẬP"}</h1>

        <form onSubmit={handleSubmit} noValidate className="bl-auth-form">
          {isRegister && <div className="bl-auth-field">
            <label htmlFor="register-name">Họ và tên</label>
            <input id="register-name" name="fullName" autoComplete="name" value={fullName}
              placeholder="Nhập họ và tên của bạn" required
              onChange={(event) => { setFullName(event.target.value); setMessage(""); }} />
          </div>}
          <div className="bl-auth-field">
            <label htmlFor="login-phone">Số điện thoại</label>
            <input id="login-phone" name="phone" type="tel" inputMode="numeric"
              autoComplete="tel" value={phone} maxLength={15} required
              placeholder="Nhập số điện thoại của bạn"
              onChange={(event) => { setPhone(event.target.value); setMessage(""); }} />
          </div>
          <div className="bl-auth-field">
            <label htmlFor="login-password">Mật khẩu</label>
            <div className="bl-auth-password">
              <input id="login-password" name="password"
                type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"}
                className="brewlite-password-input" value={password} required
                placeholder="Nhập mật khẩu của bạn"
                onChange={(event) => { setPassword(event.target.value); setMessage(""); }} />
              <button type="button" className="bl-auth-eye"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-pressed={showPassword}>
                <EyeIcon hidden={showPassword} />
              </button>
            </div>
          </div>
          {message && <p role="status" aria-live="polite" className="bl-auth-message">{message}</p>}
          <button type="submit" className="bl-auth-submit">{isRegister ? "ĐĂNG KÝ" : "ĐĂNG NHẬP"}</button>
        </form>

        <p className="bl-auth-register">{isRegister ? "Đã có tài khoản? " : "Chưa có tài khoản? "}<button type="button" className="bl-auth-switch" onClick={switchMode}>{isRegister ? "Đăng nhập" : "Đăng ký"}</button></p>
      </section>
  );
  return onClose ? (
    <dialog ref={dialogRef} className="bl-auth-dialog" aria-labelledby="login-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      {card}
    </dialog>
  ) : <main className="bl-auth-page">{card}</main>;
}