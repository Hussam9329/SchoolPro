export function buildErrorRedirect(
  path: string,
  error: string,
  message?: string,
): string {
  const params = new URLSearchParams({ error });

  if (message) {
    params.set("reason", message);
  }

  return `${path}?${params.toString()}`;
}

export function buildFormErrorRedirect(
  path: string,
  error: string,
  formData: FormData,
  fields: string[],
  message?: string,
): string {
  const params = new URLSearchParams({ error });

  if (message) {
    params.set("reason", message);
  }

  for (const field of fields) {
    const values = formData
      .getAll(field)
      .map((value) => String(value ?? ""))
      .filter((value) => value.length > 0);

    if (values.length === 1) {
      params.set(`draft_${field}`, values[0]);
    } else if (values.length > 1) {
      for (const value of values) {
        params.append(`draft_${field}`, value);
      }
    }
  }

  return `${path}?${params.toString()}`;
}
