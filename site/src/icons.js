/**
 * Lucide icon components — registered globally so they can be used
 * in any template as <LucideSearch />, <LucideLink />, etc.
 *
 * Replaces the old lucide.createIcons() DOM-scanning approach.
 */
import {
  ArrowLeft,
  ArrowUpDown,
  Bookmark,
  Database,
  Download,
  EllipsisVertical,
  FileUp,
  GitCompareArrows,
  Globe,
  Hammer,
  Hash,
  Info,
  LayoutGrid,
  Link,
  List,
  Map,
  MessageCircle,
  Plus,
  Save,
  Scale,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
  Trash2,
} from 'lucide-vue-next';

export const lucideIcons = {
  LucideArrowLeft: ArrowLeft,
  LucideArrowUpDown: ArrowUpDown,
  LucideBookmark: Bookmark,
  LucideDatabase: Database,
  LucideDownload: Download,
  LucideGitCompareArrows: GitCompareArrows,
  LucideHammer: Hammer,
  LucideEllipsisVertical: EllipsisVertical,
  LucideFileUp: FileUp,
  LucideHash: Hash,
  LucideInfo: Info,
  LucideLayoutGrid: LayoutGrid,
  LucideLink: Link,
  LucideList: List,
  LucideMap: Map,
  LucideMessageCircle: MessageCircle,
  LucidePlus: Plus,
  LucideSave: Save,
  LucideScale: Scale,
  LucideSearch: Search,
  LucideSettings: Settings,
  LucideSlidersHorizontal: SlidersHorizontal,
  LucideStar: Star,
  LucideTrash2: Trash2,
};

/** Map from kebab-case icon name to component (for dynamic icon lookup) */
export const iconMap = {
  'arrow-left': ArrowLeft,
  'arrow-up-down': ArrowUpDown,
  'bookmark': Bookmark,
  'download': Download,
  'ellipsis-vertical': EllipsisVertical,
  'file-up': FileUp,
  'globe': Globe,
  'hash': Hash,
  'layout-grid': LayoutGrid,
  'link': Link,
  'list': List,
  'plus': Plus,
  'save': Save,
  'scale': Scale,
  'search': Search,
  'settings': Settings,
  'sliders-horizontal': SlidersHorizontal,
  'star': Star,
  'trash-2': Trash2,
};

export function registerLucideIcons(app) {
  for (const [name, component] of Object.entries(lucideIcons)) {
    app.component(name, component);
  }
}
