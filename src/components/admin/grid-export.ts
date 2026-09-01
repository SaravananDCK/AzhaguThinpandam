"use client";

import type { DataGridTypes } from "devextreme-react/data-grid";

/**
 * Excel export for the admin grids. One handler shared by all of them so every
 * grid exports the same way: what you see is what you get — the current filter,
 * sort and column order, with lookup columns written as their labels.
 *
 * exceljs is ~1MB, and none of it is needed until someone actually clicks
 * Export, so both it and DevExtreme's exporter are pulled in on demand.
 */
export function exportGrid(fileName: string) {
  return async (e: DataGridTypes.ExportingEvent) => {
    const [{ Workbook }, { exportDataGrid }] = await Promise.all([
      import("exceljs"),
      import("devextreme/excel_exporter"),
    ]);

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(fileName);

    await exportDataGrid({
      component: e.component,
      worksheet,
      // Column filters in the spreadsheet itself, so the export stays useful
      // after it leaves the app.
      autoFilterEnabled: true,
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };
}
