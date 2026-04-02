/**
 * Centralized query key factory.
 * Using factory functions ensures keys are consistent and type-safe.
 * Invalidating a parent key (e.g. queryKeys.playgrounds.all) automatically
 * invalidates all child keys.
 */
export const queryKeys = {
  // Playground list for the current user
  playgrounds: {
    all: ["playgrounds"] as const,
    lists: () => [...queryKeys.playgrounds.all, "list"] as const,
    list: (userId: string) =>
      [...queryKeys.playgrounds.lists(), { userId }] as const,
  },

  // Single playground detail + template
  playground: {
    all: ["playground"] as const,
    details: () => [...queryKeys.playground.all, "detail"] as const,
    detail: (id: string) =>
      [...queryKeys.playground.details(), id] as const,
    template: (id: string) =>
      [...queryKeys.playground.all, "template", id] as const,
  },

  // GitHub repos for the current user
  github: {
    repos: ["github", "repos"] as const,
  },
} as const;
