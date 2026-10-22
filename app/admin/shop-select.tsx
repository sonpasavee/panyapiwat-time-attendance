"use client";

import { useRouter } from "next/navigation";

export default function ShopSelect({
  value, options, baseParams, termId, terms, gradeLevel, section, classGroupOptions,
}: {
  value: string;
  options: string[];
  baseParams: Record<string, string>;
  termId: string;
  terms: Array<{ id: string; academicYear: number; semester: number }>;
  gradeLevel: string;
  section: string;
  classGroupOptions: Array<{ yearLevel: number; section: string }>;
}) {
  const router = useRouter();

  function navigate(params: URLSearchParams) {
    const query = params.toString();
    router.push(query ? `/admin?${query}` : "/admin");
  }

  function update(key: string, next: string) {
    const params = new URLSearchParams(baseParams);
    if (value) params.set("shopCode", value);
    if (gradeLevel) params.set("gradeLevel", gradeLevel);
    if (section) params.set("section", section);
    if (next) params.set(key, next); else params.delete(key);
    if (key === "gradeLevel") params.delete("section");
    navigate(params);
  }

  function navigateTerm(nextTermId: string) {
    const params = new URLSearchParams(baseParams);
    params.set("academicTermId", nextTermId);
    params.delete("shopCode");
    params.delete("gradeLevel");
    params.delete("section");
    navigate(params);
  }

  return (
    <>
      <label htmlFor="ov-term" className="sr-only">ภาคเรียน</label>
      <select id="ov-term" className="ov-shopselect" value={termId} onChange={(e) => navigateTerm(e.target.value)}>
        {terms.map((term) => <option key={term.id} value={term.id}>ภาค {term.semester}/{term.academicYear}</option>)}
      </select>
      <label htmlFor="ov-shop" className="sr-only">สาขาฝึกงาน</label>
      <select id="ov-shop" className="ov-shopselect" value={value} onChange={(e) => update("shopCode", e.target.value)}>
        <option value="">ทุกร้าน</option>
        {options.map((code) => <option key={code} value={code}>{code}</option>)}
      </select>
      <label htmlFor="ov-grade" className="sr-only">ชั้นปี</label>
      <select id="ov-grade" className="ov-shopselect" value={gradeLevel} onChange={(e) => update("gradeLevel", e.target.value)}>
        <option value="">ทุกชั้นปี</option>
        {[...new Set(classGroupOptions.map((group) => group.yearLevel))].sort((a, b) => a - b).map((level) => <option key={level} value={level}>ปี {level}</option>)}
      </select>
      <label htmlFor="ov-section" className="sr-only">ห้อง</label>
      <select id="ov-section" className="ov-shopselect" value={section} onChange={(e) => update("section", e.target.value)}>
        <option value="">ทุกห้อง</option>
        {[...new Set(classGroupOptions.filter((group) => !gradeLevel || group.yearLevel === Number(gradeLevel)).map((group) => group.section))].sort().map((room) => <option key={room} value={room}>ห้อง {room}</option>)}
      </select>
    </>
  );
}
