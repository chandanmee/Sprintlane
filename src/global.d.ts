import type { SprintLaneApi } from '@shared/types'

declare global {
  interface Window {
    sprintlane: SprintLaneApi
  }
}

export {}
