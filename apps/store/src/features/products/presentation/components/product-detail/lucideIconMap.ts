import {
  Sparkles,
  Shield,
  Clock,
  Star,
  Heart,
  Zap,
  Palette,
  Music,
  Download,
  MapPin,
  Users,
  Award,
  Wind,
  Package,
  Brush,
  Image,
  FileText,
  Truck,
  type LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Shield,
  Clock,
  Star,
  Heart,
  Zap,
  Palette,
  Music,
  Download,
  MapPin,
  Users,
  Award,
  Wind,
  Package,
  Brush,
  Image,
  FileText,
  Truck,
};

export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Sparkles;
}
