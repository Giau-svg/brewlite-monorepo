import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteFrame } from "../../../components/layout/site-frame";
import { ProductDetailView } from "../../../components/product/product-detail";

export const metadata: Metadata = { title: "Chi tiết món" };
export const instant = false;

export default function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  return (
    <SiteFrame>
      <Suspense fallback={<p className="container" role="status" style={{ padding: "4rem 0" }}>Đang tải món...</p>}>
        <ResolvedProduct params={params} searchParams={searchParams} />
      </Suspense>
    </SiteFrame>
  );
}

async function ResolvedProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const editKey = typeof query.edit === "string" ? query.edit : undefined;
  return <ProductDetailView key={`${id}-${editKey ?? "new"}`} id={id} editKey={editKey} />;
}
