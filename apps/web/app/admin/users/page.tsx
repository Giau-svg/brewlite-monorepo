import type { Metadata } from "next";
import { AdminUsersPage } from "../../../components/admin-users/admin-users-page";

export const metadata: Metadata = {
  title: "Người dùng | BrewLite",
  description: "Xem tài khoản và vai trò Khách, Nhân viên, Chủ cửa hàng.",
};

export default function Page() {
  return <AdminUsersPage />;
}
