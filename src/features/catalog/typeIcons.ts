// Ikony typów obiektów (Lucide): typ jest zawsze rozróżniany ikoną i tekstem, nie tylko kolorem (sekcja 8).
import {
  Blend,
  CircleDot,
  CircleQuestionMark,
  Cloud,
  CloudFog,
  Cloudy,
  Grip,
  Haze,
  Orbit,
  Sparkle,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { DsoType } from '../../types'

export const TYPE_ICONS: Record<DsoType, LucideIcon> = {
  galaxy: Orbit,
  galaxy_group: Blend,
  emission_nebula: Cloud,
  reflection_nebula: Cloudy,
  dark_nebula: CloudFog,
  planetary_nebula: CircleDot,
  supernova_remnant: Sparkle,
  open_cluster: Sparkles,
  globular_cluster: Grip,
  cluster_nebula: Haze,
  other: CircleQuestionMark,
}
