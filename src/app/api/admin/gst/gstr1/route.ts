import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { parseMonthParam } from "@/lib/finance";
import { buildGstr1 } from "@/lib/gst-report";
import { gstr1Workbook } from "@/lib/gst-excel";

// Excel download for the GST returns page (?month=YYYY-MM)
export async function GET(req: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const month = req.nextUrl.searchParams.get("month") ?? "";
  const range = parseMonthParam(month);
  if (!range) return NextResponse.json({ error: "Pass ?month=YYYY-MM" }, { status: 400 });

  const xlsx = await gstr1Workbook(await buildGstr1(range.from, range.to), month);
  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="GSTR1-${month}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
