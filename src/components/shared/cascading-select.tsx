"use client";

import { useRouter } from "next/navigation";

type CascadingSelectProps = {
  name: string;
  options: { value: string; label: string }[];
  placeholder: string;
  value: string;
  paramKey: string;
  currentParams: Record<string, string>;
  resetKeys?: string[];
  disabled?: boolean;
  className?: string;
};

export function CascadingSelect({
  name,
  options,
  placeholder,
  value,
  paramKey,
  currentParams,
  resetKeys,
  disabled,
  className,
}: CascadingSelectProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    const params = new URLSearchParams();

    for (const [key, val] of Object.entries(currentParams)) {
      if (val) params.set(key, val);
    }

    if (newValue) {
      params.set(paramKey, newValue);
    } else {
      params.delete(paramKey);
    }

    if (resetKeys && newValue !== value) {
      for (const key of resetKeys) {
        params.delete(key);
      }
    }

    const queryString = params.toString();
    router.push(queryString ? `/grades?${queryString}` : "/grades");
  };

  return (
    <select
      id={name}
      name={name}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      className={className ?? "input"}
      autoComplete="off"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
