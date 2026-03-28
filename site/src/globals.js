/**
 * Temporary globals bridge — sets up window/globalThis globals that app.js
 * references as bare identifiers. This module must be imported by app.js
 * before any code that uses these globals runs.
 *
 * This file will be removed once all consumers use ES imports directly.
 */
import Fuse from 'fuse.js';
import * as FloatingUIDOM from '@floating-ui/dom';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

globalThis.Fuse = Fuse;
globalThis.FloatingUIDOM = FloatingUIDOM;
globalThis.Chart = Chart;
