import type { Measurement } from "../api/types";
import { formatDate, formatNumber } from "../lib/format";

interface DataTableProps {
  rows: Measurement[];
}

export function DataTable({ rows }: DataTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Temps</th>
            <th>BPM</th>
            <th>SpO2</th>
            <th>Pas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{formatDate(row.captured_at)}</td>
              <td>{formatNumber(row.heart_rate_bpm, " bpm")}</td>
              <td>{formatNumber(row.spo2_percent, " %")}</td>
              <td>{formatNumber(row.step_count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
