import { createApp } from 'vue';
import App from './App.vue';

// Local scripts (side-effect imports — attach to globalThis)
import '../js/lzo1x.js';
import '../js/scop-parser.js';
import '../js/scoc-parser.js';

// App definition + directives (globals.js is imported transitively by app.js)
import { tooltipDirective, clickOutsideDirective } from '../js/app.js';
import { registerLucideIcons } from './icons.js';

// Register Service Worker for image caching (icons, faction images, etc.)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration is best-effort; failures are silent
    });
  });
}

const app = createApp(App);
app.directive('tooltip', tooltipDirective);
app.directive('click-outside', clickOutsideDirective);
registerLucideIcons(app);
app.mount('#app');
