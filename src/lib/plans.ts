export type Plan = "free" | "pro" | "max";

export interface PlanConfig {
  label: string;
  price: number; // USD/month (0 = free)
  chatsPerDay: number;
  maxBots: number;
  maxPages: number;
  fileUploads: boolean;
  customization: boolean;
  description: string;
}

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    label: "Free",
    price: 0,
    chatsPerDay: 50,
    maxBots: 2,
    maxPages: 20,
    fileUploads: false,
    customization: false,
    description: "Get started with AI chatbots",
  },
  pro: {
    label: "Pro",
    price: 20,
    chatsPerDay: 500,
    maxBots: 10,
    maxPages: 50,
    fileUploads: true,
    customization: false,
    description: "For growing businesses",
  },
  max: {
    label: "Max",
    price: 45,
    chatsPerDay: 10000,
    maxBots: Infinity,
    maxPages: 100,
    fileUploads: true,
    customization: true,
    description: "Unlimited power & full customization",
  },
};

export function getPlanConfig(plan: Plan): PlanConfig {
  return PLANS[plan];
}

export function canCreateBot(plan: Plan, currentBotCount: number): boolean {
  const limit = PLANS[plan].maxBots;
  return limit === Infinity || currentBotCount < limit;
}

export function canUploadFiles(plan: Plan): boolean {
  return PLANS[plan].fileUploads;
}

export function hasCustomization(plan: Plan): boolean {
  return PLANS[plan].customization;
}

export function isOverDailyLimit(plan: Plan, dailyCount: number): boolean {
  return dailyCount >= PLANS[plan].chatsPerDay;
}

/** Returns remaining chats today, or Infinity for Max */
export function remainingChats(plan: Plan, dailyCount: number): number {
  const limit = PLANS[plan].chatsPerDay;
  return Math.max(0, limit - dailyCount);
}
