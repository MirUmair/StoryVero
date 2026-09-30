export type Plan = 'FREE' | 'PRO';
export type AdPlacement = 'home' | 'templates' | 'export-result';
export interface AdService {
  show(placement: AdPlacement): Promise<boolean>;
}
// No SDK, identifiers, tracking, subscriptions, or ads during editing.
export const adService: AdService = { show: async () => false };
export const currentPlan: Plan = 'FREE';
