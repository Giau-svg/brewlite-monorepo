import type { Metadata } from "next";
import LoginForm from "../../components/auth/login-form";

export const metadata: Metadata = {
  title: "Đăng nhập | BrewLite",
  description: "Đăng nhập vào BrewLite bằng số điện thoại và mật khẩu.",
};

export default function LoginPage() {
  return <LoginForm />;
}
