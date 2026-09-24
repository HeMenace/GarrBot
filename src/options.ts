export function getOption<T>(options: readonly { name: string; value?: unknown }[] | undefined, name: string): T | undefined {
  return options?.find((option) => option.name === name)?.value as T | undefined;
}
