import Link from "next/link";

type PagerProps = {
  pathname: string;
  params: Record<string, string>;
  page: number;
  totalPages: number;
  numbered?: boolean;
  summary?: string;
};

function pageWindow(page: number, totalPages: number) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  return [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
}

export default function Pager({
  pathname,
  params,
  page,
  totalPages,
  numbered = false,
  summary,
}: PagerProps) {
  if (totalPages <= 1 && !summary) return null;

  const href = (target: number) =>
    `${pathname}?${new URLSearchParams({ ...params, page: String(target) })}`;

  const btn =
    "btn btn-outline min-h-[44px] min-w-[44px] px-3.5 text-[13px]";
  const numActive =
    "btn btn-primary min-h-[44px] min-w-[44px] px-0 text-[13px]";
  const numIdle =
    "btn btn-outline min-h-[44px] min-w-[44px] px-0 text-[13px] font-normal";

  return (
    <div className="flex flex-col gap-2.5 border-t border-[#edf1f7] px-4 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-6">
      {summary && <span className="text-[13px] muted">{summary}</span>}
      <div className="flex max-w-full items-center gap-1.5 overflow-x-auto pb-0.5">
        {page > 1 ? (
          <Link href={href(page - 1)} className={btn}>
            ก่อนหน้า
          </Link>
        ) : numbered ? (
          <span className={`${btn} pointer-events-none opacity-40`}>ก่อนหน้า</span>
        ) : null}
        {numbered &&
          pageWindow(page, totalPages).map((p, i, arr) => (
            <span key={p} className="flex items-center gap-1.5">
              {i > 0 && arr[i - 1] !== p - 1 && (
                <span className="muted px-1" aria-hidden="true">
                  …
                </span>
              )}
              {p === page ? (
                <span aria-current="page" className={numActive}>
                  {p}
                </span>
              ) : (
                <Link href={href(p)} className={numIdle}>
                  {p}
                </Link>
              )}
            </span>
          ))}
        {page < totalPages ? (
          <Link href={href(page + 1)} className={btn}>
            ถัดไป
          </Link>
        ) : numbered ? (
          <span className={`${btn} pointer-events-none opacity-40`}>ถัดไป</span>
        ) : null}
      </div>
    </div>
  );
}
