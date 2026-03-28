import { createApp } from 'vue';
import App from './App.vue';

// Local scripts (side-effect imports — attach to globalThis)
import '../js/lzo1x.js';
import '../js/scop-parser.js';
import '../js/scoc-parser.js';

// App definition + directives (globals.js is imported transitively by app.js)
import { tooltipDirective, clickOutsideDirective } from '../js/app.js';

const app = createApp(App);
app.directive('tooltip', tooltipDirective);
app.directive('click-outside', clickOutsideDirective);
app.mount('#app');
