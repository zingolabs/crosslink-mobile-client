const CAPACITY = 50;

const ring: string[] = new Array(CAPACITY);
let next = 0;
let size = 0;

export const breadcrumb = (action: string): void => {
  ring[next] = action;
  next = (next + 1) % CAPACITY;
  if (size < CAPACITY) {
    size += 1;
  }
};

export const breadcrumbs = (): string[] => {
  const start = (next - size + CAPACITY) % CAPACITY;
  const out: string[] = [];
  for (let i = 0; i < size; i += 1) {
    out.push(ring[(start + i) % CAPACITY]);
  }
  return out;
};

export const clearBreadcrumbs = (): void => {
  next = 0;
  size = 0;
};
