import type { Metadata } from "next";
import { AdminProductsPage } from "../../../components/admin-products/admin-products-page";

export const metadata: Metadata = {
  title: "Sản phẩm | BrewLite",
  description: "Quản lý đồ uống, size, topping và tình trạng bán.",
};

export default function Page() {
  return <AdminProductsPage />;
}
