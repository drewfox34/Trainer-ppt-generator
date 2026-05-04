import { Search } from "lucide-react";
import { ExerciseFilters as Filters, Facets } from "../types";

type Props = {
  filters: Filters;
  facets?: Facets;
  onChange: (filters: Filters) => void;
};

type FacetFilterKey = keyof Facets;

const fieldLabels: Array<[FacetFilterKey, string]> = [
  ["category", "Category"],
  ["body_region", "Body region"],
  ["equipment", "Equipment"],
  ["difficulty", "Difficulty"]
];

export default function ExerciseFilters({ filters, facets, onChange }: Props) {
  const update = (key: keyof Filters, value: string) => onChange({ ...filters, [key]: value });

  return (
    <div className="filter-bar">
      <label className="search-field">
        <Search size={16} />
        <input
          value={filters.search}
          onChange={(event) => update("search", event.target.value)}
          placeholder="Search name or code"
        />
      </label>

      {fieldLabels.map(([key, label]) => (
        <label className="select-field" key={key}>
          <span>{label}</span>
          <select value={filters[key]} onChange={(event) => update(key, event.target.value)}>
            <option value="">All</option>
            {(facets?.[key] || []).map((item) => (
              <option key={item.value} value={item.value}>{item.value}</option>
            ))}
          </select>
        </label>
      ))}

      <label className="tags-field">
        <span>Tags</span>
        <input
          value={filters.tags}
          onChange={(event) => update("tags", event.target.value)}
          placeholder="mobility, strength"
        />
      </label>
    </div>
  );
}
