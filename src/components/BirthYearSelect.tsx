import { BIRTH_YEARS } from "@/lib/constants";

// 출생연도 선택 드롭다운 (attendance 회원/게스트, settings 회원수정 공용).
export default function BirthYearSelect({
  value,
  onChange,
  className = "notion-input",
}: {
  value: number | "";
  onChange: (year: number | "") => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
      className={className}
    >
      <option value="">출생년도 선택</option>
      {BIRTH_YEARS.map((year) => (
        <option key={year} value={year}>
          {year}년
        </option>
      ))}
    </select>
  );
}
