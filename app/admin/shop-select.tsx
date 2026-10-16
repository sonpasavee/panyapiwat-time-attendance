"use client";

import { useRouter } from "next/navigation";

export default function ShopSelect({
  value,
  options,
  baseParams,
}: {
  value: string;
  options: string[];
  baseParams: Record<string, string>;
}) {
  const router = useRouter();

  function navigate(shop: string) {
    const params = new URLSearchParams(baseParams);
    if (shop) params.set("shopCode", shop);
    else params.delete("shopCode");
    const query = params.toString();
    router.push(query ? `/admin?${query}` : "/admin");
  }

  return (
    <>
      <label htmlFor="ov-shop" className="sr-only">
        รหัสร้าน
      </label>
      <select
        id="ov-shop"
        className="ov-shopselect"
        value={value}
        onChange={(e) => navigate(e.target.value)}
      >
        <option value="">ทุกร้าน</option>
        {options.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </>
  );
}
