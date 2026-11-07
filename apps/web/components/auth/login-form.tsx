"use client";

import { validPassword } from '../../lib/password-policy';
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authError, login, register, resendOtp, verifyEmail, type AuthUser } from "../../services/auth.service";
import { setAuthUser } from "../../lib/auth-store";
import "./login-form.css";

type Mode = "login" | "register" | "verify";
export default function LoginForm({ onClose, initialMode = "login", onSuccess }: { onClose?: () => void; initialMode?: "login" | "register"; onSuccess?: (user: AuthUser) => void } = {}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!onClose) return;
    const dialog = dialogRef.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => { dialog?.close(); document.body.style.overflow = previous; };
  }, [onClose]);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  function switchMode(next: Mode) { setMode(next); setPassword(""); setCode(""); setMessage(""); setVisible(false); }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setMessage("");
    const address = email.trim().toLowerCase();
    if (mode === "register" && (!validPassword(password))) {
      setMessage("Mật khẩu cần ít nhất 15 ký tự và tối đa 72 byte UTF-8."); return;
    }
    setPending(true);
    try {
      if (mode === "register") {
        const result = await register(fullName.trim(), address, password);
        setPassword(""); setMode("verify"); setMessage(result.message);
      } else if (mode === "verify") {
        const result = await verifyEmail(address, code);
        setMode("login"); setCode(""); setMessage(result.message);
      } else {
        const user = await login(address, password);
        setPassword(""); setAuthUser(user);
        if (onSuccess) onSuccess(user);
        else if (onClose) onClose();
        else router.push("/");
      }
    } catch (error) { setMessage(authError(error)); }
    finally { setPending(false); }
  }
  async function resend() {
    if (pending || !email.trim()) return;
    setPending(true);
    try { setMessage((await resendOtp(email.trim().toLowerCase())).message); setMode("verify"); setPassword(""); }
    catch (error) { setMessage(authError(error)); }
    finally { setPending(false); }
  }
  const title = mode === "register" ? "ĐĂNG KÝ" : mode === "verify" ? "XÁC MINH EMAIL" : "ĐĂNG NHẬP";
  const card = <section className="bl-auth-card" aria-labelledby="login-title">
    {onClose ? <button type="button" className="bl-auth-close" onClick={onClose} aria-label="Đóng">×</button> : <Link href="/" className="bl-auth-close" aria-label="Về trang chủ">×</Link>}
    <h1 id="login-title">{title}</h1>
    <form onSubmit={(event) => { void handleSubmit(event); }} className="bl-auth-form" aria-busy={pending}>
      {mode === "register" && <div className="bl-auth-field"><label htmlFor="auth-name">Họ và tên</label><input id="auth-name" autoComplete="name" required maxLength={100} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nhập họ và tên" /></div>}
      <div className="bl-auth-field"><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Nhập email của bạn" /></div>
      {mode !== "verify" && <div className="bl-auth-field"><label htmlFor="auth-password">Mật khẩu</label><div className="bl-auth-password">
        <input id="auth-password" className="brewlite-password-input" type={visible ? "text" : "password"} autoComplete={mode === "register" ? "new-password" : "current-password"} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu của bạn" />
        <button type="button" className="bl-auth-eye" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={visible}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>{visible && <path d="m3 3 18 18"/>}</svg></button>
      </div></div>}
      {mode === "verify" && <div className="bl-auth-field"><label htmlFor="auth-code">Mã OTP trong email</label><input id="auth-code" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} placeholder="Nhập 6 chữ số" /></div>}
      {message && <p className="bl-auth-message" role="status">{message}</p>}
      <button type="submit" className="bl-auth-submit" disabled={pending}>{pending ? "ĐANG XỬ LÝ…" : title}</button>
    </form>
    {mode === "verify" ? <p className="bl-auth-register"><button type="button" className="bl-auth-switch" disabled={pending} onClick={() => { void resend(); }}>Gửi lại OTP</button> · <button type="button" className="bl-auth-switch" disabled={pending} onClick={() => switchMode("login")}>Đăng nhập</button></p> : <>
      <p className="bl-auth-register">{mode === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}<button type="button" className="bl-auth-switch" disabled={pending} onClick={() => switchMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Đăng ký" : "Đăng nhập"}</button></p>
      {mode === "login" && <p className="bl-auth-register"><button type="button" className="bl-auth-switch" disabled={pending} onClick={() => switchMode("verify")}>Xác minh email / Gửi lại OTP</button></p>}
    </>}
  </section>;
  return onClose ? <dialog ref={dialogRef} className="bl-auth-dialog" aria-labelledby="login-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>{card}</dialog> : <main className="bl-auth-page">{card}</main>;
}