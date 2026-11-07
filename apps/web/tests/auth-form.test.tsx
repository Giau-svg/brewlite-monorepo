import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginForm from "../components/auth/login-form";
import { login, register, verifyEmail } from "../services/auth.service";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../services/auth.service", () => ({ login: vi.fn(), register: vi.fn(), verifyEmail: vi.fn(), resendOtp: vi.fn(), authError: () => "Thông tin không hợp lệ" }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const user = { id: "user", fullName: "Customer", email: "customer@example.com", role: "CUSTOMER" as const, emailVerifiedAt: "2026-11-07", loyaltyPoints: 0 };

it("registers email then verifies OTP before allowing login", async () => {
  vi.mocked(register).mockResolvedValue({ message: "OTP đã gửi" });
  vi.mocked(verifyEmail).mockResolvedValue({ message: "Email đã xác minh" });
  vi.mocked(login).mockResolvedValue(user);
  const success = vi.fn();
  render(<LoginForm initialMode="register" onSuccess={success} />);
  fireEvent.change(screen.getByLabelText("Họ và tên"), { target: { value: "Customer" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "customer@example.com" } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "A strong password 2026" } });
  fireEvent.click(screen.getByRole("button", { name: "ĐĂNG KÝ" }));
  expect(await screen.findByLabelText("Mã OTP trong email")).toBeTruthy();
  expect(success).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Mã OTP trong email"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "XÁC MINH EMAIL" }));
  await screen.findByRole("button", { name: "ĐĂNG NHẬP" });
  expect(verifyEmail).toHaveBeenCalledWith("customer@example.com", "123456");
  expect(success).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "A strong password 2026" } });
  fireEvent.click(screen.getByRole("button", { name: "ĐĂNG NHẬP" }));
  await waitFor(() => expect(success).toHaveBeenCalledWith(user));
});

it("does not treat failed login as authenticated", async () => {
  vi.mocked(login).mockRejectedValue(new Error("unauthorized"));
  const success = vi.fn();
  render(<LoginForm onSuccess={success} />);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "customer@example.com" } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "wrong" } });
  fireEvent.click(screen.getByRole("button", { name: "ĐĂNG NHẬP" }));
  expect(await screen.findByRole("status")).toBeTruthy();
  expect(success).not.toHaveBeenCalled();
});