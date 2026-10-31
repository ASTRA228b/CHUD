export interface Starter { id: string; name: string; category: string; description: string; libraries: string[] }
export const starters: Starter[];
export function starterSource(id: string, title?: string): string;
