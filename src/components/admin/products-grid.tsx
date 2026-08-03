"use client";

import "@/components/admin/dx-setup";
import { useRouter } from "next/navigation";
import DataGrid, {
  Column,
  FilterRow,
  HeaderFilter,
  Lookup,
  Pager,
  Paging,
  SearchPanel,
  StateStoring,
} from "devextreme-react/data-grid";
import { Badge } from "@/components/ui/badge";

export type ProductRow = {
  id: string;
  image: string | null;
  name: string;
  tamilName: string | null;
  category: string;
  priceMinRupees: number | null;
  priceMaxRupees: number | null;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  isFlagship: boolean;
};

/**
 * A product's headline state, as one sortable/filterable value.
 *
 * The badges aren't mutually exclusive (a flagship can also be featured), so
 * this picks the one that matters most: hidden beats everything, then flagship,
 * then featured. The cell still renders every badge that applies.
 */
const STATUSES = ["Hidden", "Flagship", "Featured", "Live"] as const;

function statusOf(row: ProductRow): (typeof STATUSES)[number] {
  if (!row.isActive) return "Hidden";
  if (row.isFlagship) return "Flagship";
  if (row.isFeatured) return "Featured";
  return "Live";
}

function priceText(row: ProductRow) {
  if (row.priceMinRupees === null) return "—";
  const min = `₹${row.priceMinRupees.toLocaleString("en-IN")}`;
  if (row.priceMaxRupees === null || row.priceMaxRupees === row.priceMinRupees) return min;
  return `${min} – ₹${row.priceMaxRupees.toLocaleString("en-IN")}`;
}

export function ProductsGrid({ rows }: { rows: ProductRow[] }) {
  const router = useRouter();

  return (
    <DataGrid
      dataSource={rows}
      keyExpr="id"
      showBorders
      columnAutoWidth
      rowAlternationEnabled
      hoverStateEnabled
      onRowClick={(e) => router.push(`/admin/products/${e.data.id}`)}
    >
      {/* Persist filter/search/sort/page across edit-and-back within the session */}
      <StateStoring enabled type="sessionStorage" storageKey="admin-products-grid" savingTimeout={300} />
      <FilterRow visible />
      <HeaderFilter visible />
      <SearchPanel visible width={240} placeholder="Search products…" />
      <Paging defaultPageSize={20} />
      <Pager showInfo showNavigationButtons allowedPageSizes={[20, 50]} showPageSizeSelector />
      <Column
        caption=""
        width={56}
        allowFiltering={false}
        allowSorting={false}
        cellRender={({ data }: { data: ProductRow }) => (
          <span className="block size-9 overflow-hidden rounded-md border bg-muted">
            {data.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.image} alt="" className="size-full object-cover" />
            )}
          </span>
        )}
      />
      <Column
        dataField="name"
        caption="Product"
        cellRender={({ data }: { data: ProductRow }) => (
          <span>
            <span className="font-medium text-primary">{data.name}</span>
            {data.tamilName && (
              <span className="block text-xs text-muted-foreground">{data.tamilName}</span>
            )}
          </span>
        )}
      />
      <Column dataField="category" width={170} />
      <Column
        dataField="priceMinRupees"
        caption="Price"
        width={140}
        allowHeaderFiltering={false}
        cellRender={({ data }: { data: ProductRow }) => <span>{priceText(data)}</span>}
      />
      <Column
        dataField="stock"
        caption="Stock"
        width={95}
        dataType="number"
        allowHeaderFiltering={false}
        cellRender={({ value }: { value: number }) => (
          <Badge variant={value === 0 ? "destructive" : "outline"}>{value}</Badge>
        )}
      />
      <Column
        caption="Status"
        width={170}
        // Derived from isActive/isFlagship/isFeatured, so the grid needs an
        // explicit value to sort and filter on — the badges alone aren't data.
        calculateCellValue={statusOf}
        dataType="string"
        cellRender={({ data }: { data: ProductRow }) => (
          <span className="flex gap-1">
            {!data.isActive && <Badge variant="secondary">Hidden</Badge>}
            {data.isFlagship && <Badge className="bg-gold-500 text-white">Flagship</Badge>}
            {data.isFeatured && <Badge>Featured</Badge>}
            {data.isActive && !data.isFeatured && <Badge variant="outline">Live</Badge>}
          </span>
        )}
      >
        {/* Dropdown of the four states instead of free-text matching */}
        <Lookup dataSource={[...STATUSES]} />
      </Column>
      <Column dataField="isActive" caption="Visible" dataType="boolean" width={95} />
    </DataGrid>
  );
}
