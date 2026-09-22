import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { projectCopy } from "./project-copy";
import type { ProjectInput } from "./project-service";
export function ProjectFields({
  values,
  onChange,
  linkedClient = false,
  hideClient = false,
}: {
  linkedClient?: boolean;
  hideClient?: boolean;
  values?: ProjectInput;
  onChange?: (field: keyof ProjectInput, value: string) => void;
}) {
  const { locale } = useLocale(),
    c = projectCopy[locale];
  return (
    <>
      {(["name", "client_name", "city", "address"] as const)
        .filter((field) => !hideClient || field !== "client_name")
        .map((field) => (
          <label className="field" key={field} htmlFor={`project-${field}`}>
            {c[field === "client_name" ? "client" : field]}
            <Input
              id={`project-${field}`}
              name={field === "name" ? "project_name" : field}
              readOnly={linkedClient && field === "client_name"}
              required={field !== "address"}
              maxLength={field === "address" ? 300 : 120}
              defaultValue={onChange ? undefined : (values?.[field] ?? "")}
              value={onChange ? (values?.[field] ?? "") : undefined}
              onChange={
                onChange ? (e) => onChange(field, e.target.value) : undefined
              }
            />
          </label>
        ))}
    </>
  );
}
