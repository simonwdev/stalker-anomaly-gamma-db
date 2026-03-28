/**
 * Lucide icon components — registered globally so they can be used
 * in any template as <LucideSearch />, <LucideLink />, etc.
 *
 * Replaces the old lucide.createIcons() DOM-scanning approach.
 */
import {
  ArrowUpDown,
  Bookmark,
  Download,
  FileUp,
  Globe,
  Hash,
  LayoutGrid,
  Link,
  List,
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
  LucideArrowUpDown: ArrowUpDown,
  LucideBookmark: Bookmark,
  LucideDownload: Download,
  LucideFileUp: FileUp,
  LucideHash: Hash,
  LucideLayoutGrid: LayoutGrid,
  LucideLink: Link,
  LucideList: List,
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
  'arrow-up-down': ArrowUpDown,
  'bookmark': Bookmark,
  'download': Download,
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
