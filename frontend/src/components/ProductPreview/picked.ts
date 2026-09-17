import type { ItemState } from '@/components/ItemRows'

export interface Picked {
  id: string
  name: string
}

/** 품목 중 제품을 고른 줄만, 같은 제품은 한 번만. */
export function pickedProducts(items: ItemState[]): Picked[] {
  const seen = new Map<string, Picked>()
  for (const item of items) {
    if (item.productId !== '' && !seen.has(item.productId))
      seen.set(item.productId, { id: item.productId, name: item.productName })
  }
  return [...seen.values()]
}
