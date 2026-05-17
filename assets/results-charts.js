// =============================================================================
//  results-charts.js
//
//  Interactive visuals for four extra result blocks on the project page:
//    1. SFT scorecard          (tab:lds_sft)
//    2. Vision multi-panel     (fig:vision_results)
//    3. Selection lollipop     (tab:selection_results)
//    4. Contamination panels   (tab:attribution_recall + tab:math_eval)
//
//  All charts share a tooltip / legend pill style with the pretraining
//  chart so the page feels like one consistent family.
// =============================================================================
(function () {
    'use strict';

    const SVG_NS = 'http://www.w3.org/2000/svg';

    // Unified color palette — STRIDE always uses the page accent color so
    // the eye learns "blue = ours" across every chart on the page.
    const ACCENT = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent-blue').trim() || '#4FC3F7';

    const COLORS = {
        STRIDE:    ACCENT,
        AirRep:    '#ff8a65',
        'AirRep (PT)': '#ffb74d',
        LoGRA:     '#ef5350',
        TracIn:    '#ffb74d',
        'TF-IDF':  '#b08bff',
        GTE:       '#66bb6a',
        'GTE-Small': '#66bb6a',
        LESS:      '#4dd0e1',
        DSDM:      '#ce93d8',
        DSIR:      '#ffd54f',
        RDS:       '#9e9e9e',
        TRAK:      '#00BFB2',
        FeatSim:   '#8bc34a',
        Random:    '#888888',
    };

    const fmt3 = (v) => (v == null ? '—' : v.toFixed(3));
    const fmt4 = (v) => (v == null ? '—' : v.toFixed(4));

    function el(tag, attrs, children) {
        const node = document.createElementNS(SVG_NS, tag);
        if (attrs) for (const k in attrs) {
            if (attrs[k] != null) node.setAttribute(k, attrs[k]);
        }
        if (children) {
            (Array.isArray(children) ? children : [children]).forEach((c) => {
                if (c != null) node.appendChild(typeof c === 'string'
                    ? document.createTextNode(c) : c);
            });
        }
        return node;
    }

    function hel(tag, attrs, children) {
        const node = document.createElement(tag);
        if (attrs) for (const k in attrs) {
            if (k === 'className') node.className = attrs[k];
            else if (k === 'style' && typeof attrs[k] === 'object') {
                Object.assign(node.style, attrs[k]);
            } else if (k === 'html') node.innerHTML = attrs[k];
            else node.setAttribute(k, attrs[k]);
        }
        if (children) {
            (Array.isArray(children) ? children : [children]).forEach((c) => {
                if (c != null) node.appendChild(typeof c === 'string'
                    ? document.createTextNode(c) : c);
            });
        }
        return node;
    }

    function attachTooltip($tip, $svg, getHtml) {
        function show(evt, payload) {
            const html = getHtml(payload);
            if (!html) return;
            $tip.innerHTML = html;
            const wrap = $svg.parentElement.getBoundingClientRect();
            const x = evt.clientX - wrap.left;
            const y = evt.clientY - wrap.top;
            $tip.style.left = x + 'px';
            $tip.style.top  = y + 'px';
            $tip.classList.add('show');
        }
        function hide() { $tip.classList.remove('show'); }
        return { show, hide };
    }

    // ─────────────────────────────────────────────────────────────────────
    //  1.  SFT SCORECARD
    // ─────────────────────────────────────────────────────────────────────
    function renderSftScorecard() {
        const $mount = document.getElementById('sft-scorecard');
        const $table = document.getElementById('sft-table');
        if (!$mount) return;

        const DATASETS = [
            { key: 'alpaca',   label: 'Alpaca',   logo: 'assets/logos/alpaca.png'   },
            { key: 'tulu',     label: 'Tulu',     logo: 'assets/logos/tulu.png'     },
            { key: 'flan',     label: 'FLAN',     logo: 'assets/logos/flan.svg'     },
            { key: 'saferlhf', label: 'SafeRLHF', logo: 'assets/logos/saferlhf.svg' },
        ];

        const ROWS = [
            { name: 'STRIDE',    ours: true,
              v: { alpaca: 0.2426, tulu: 0.1611, flan: 0.1932, saferlhf: 0.3995 } },
            { name: 'AirRep',
              v: { alpaca: 0.2258, tulu: 0.1514, flan: 0.2111, saferlhf: 0.4608 } },
            { name: 'DSDM',
              v: { alpaca: 0.1215, tulu: 0.1431, flan: 0.1967, saferlhf: 0.2594 } },
            { name: 'LESS',
              v: { alpaca: 0.0959, tulu: 0.1302, flan: 0.1640, saferlhf: 0.2563 } },
            { name: 'LoGRA',
              v: { alpaca: 0.0687, tulu: 0.1016, flan: 0.1332, saferlhf: 0.2476 } },
            { name: 'TracIn',
              v: { alpaca: 0.0921, tulu: 0.1075, flan: 0.1475, saferlhf: 0.1060 } },
            { name: 'TF-IDF',
              v: { alpaca: 0.0724, tulu: 0.0524, flan: 0.0252, saferlhf: 0.2494 } },
            { name: 'GTE-Small',
              v: { alpaca: 0.0174, tulu: 0.0114, flan: 0.0092, saferlhf: 0.2680 } },
            { name: 'RDS',
              v: { alpaca: 0.0087, tulu: 0.0189, flan: 0.0074, saferlhf: 0.1194 } },
            { name: 'DSIR',
              v: { alpaca: 0.0201, tulu: -0.0049, flan: 0.0049, saferlhf: -0.0210 } },
        ];

        // Compute per-column max + 2nd max for ★ / ☆ markers.
        const top = {};
        DATASETS.forEach(({ key }) => {
            const sorted = ROWS.map((r) => r.v[key]).slice().sort((a, b) => b - a);
            top[key] = { first: sorted[0], second: sorted[1] };
        });

        // Range for bar width fill — anchor at 0, span to per-column max.
        const colMax = {};
        DATASETS.forEach(({ key }) => {
            colMax[key] = Math.max(0.01,
                ...ROWS.map((r) => Math.max(0, r.v[key])));
        });

        $mount.innerHTML = '';

        // Header row.
        $mount.appendChild(hel('div', { className: 'sft-h first' }, 'Method'));
        DATASETS.forEach(({ label, logo }) => {
            const cell = hel('div', { className: 'sft-h' });
            if (logo) {
                const img = document.createElement('img');
                img.className = 'inline-logo';
                img.src = logo; img.alt = '';
                cell.appendChild(img);
            }
            cell.appendChild(document.createTextNode(label));
            $mount.appendChild(cell);
        });

        // Body rows.
        ROWS.forEach((row) => {
            const labelCell = hel('div', {
                className: 'sft-cell label' + (row.ours ? '' : ''),
            });
            const span = document.createElement('span');
            span.textContent = row.name;
            labelCell.appendChild(span);
            if (row.ours) {
                labelCell.appendChild(hel('span', { className: 'sft-ours-pill' }, 'ours'));
            }
            // wrap whole row in pseudo-class via parent-level CSS; we just add classes.
            // To make 'tr.ours' style work in CSS grid, set class on each cell instead.
            if (row.ours) labelCell.classList.add('ours-cell');
            $mount.appendChild(labelCell);

            DATASETS.forEach(({ key }) => {
                const v = row.v[key];
                const cell = hel('div', { className: 'sft-cell' });
                if (row.ours) cell.classList.add('ours-cell');
                // Bar fill.
                const bar = hel('div', { className: 'sft-bar' });
                const pct = Math.max(0, v) / colMax[key];
                bar.style.width = (pct * 100).toFixed(1) + '%';
                cell.appendChild(bar);
                // Value.
                const val = hel('span', { className: 'sft-val' }, fmt4(v));
                cell.appendChild(val);
                // Rank chip.
                if (Math.abs(v - top[key].first) < 1e-6) cell.classList.add('top1');
                else if (Math.abs(v - top[key].second) < 1e-6) cell.classList.add('top2');
                $mount.appendChild(cell);
            });
        });

        // Mark all cells in STRIDE row as "ours" via a row-level CSS hook.
        // Since CSS grid does not let us nest rows, expose .sft-row.ours by
        // tagging each cell in the ours row with .sft-cell.ours-cell.
        const oursCells = $mount.querySelectorAll('.ours-cell');
        oursCells.forEach((c) => c.classList.add('sft-cell-ours'));

        // Augment CSS at runtime so we don't need to add yet another class to
        // the CSS file just for this single transformation.
        if (!document.getElementById('sft-ours-style')) {
            const s = document.createElement('style');
            s.id = 'sft-ours-style';
            s.textContent = `
                .sft-scorecard .sft-cell.sft-cell-ours {
                    background: rgba(79,195,247,0.10);
                }
                :root.light .sft-scorecard .sft-cell.sft-cell-ours {
                    background: rgba(26,122,199,0.10);
                }
                .sft-scorecard .sft-cell.sft-cell-ours.label {
                    color: var(--accent-blue);
                    font-weight: 700;
                }
                .sft-scorecard .sft-cell.sft-cell-ours .sft-bar {
                    background: linear-gradient(90deg, rgba(79,195,247,0.34), rgba(79,195,247,0.05));
                }
            `;
            document.head.appendChild(s);
        }

        // "Show all numbers" full table.
        if ($table) {
            const tbl = document.createElement('table');
            const thead = document.createElement('thead');
            const trh = document.createElement('tr');
            trh.appendChild(hel('th', null, 'Method'));
            DATASETS.forEach(({ label }) => trh.appendChild(hel('th', null, label)));
            thead.appendChild(trh);
            tbl.appendChild(thead);
            const tbody = document.createElement('tbody');
            ROWS.forEach((row) => {
                const tr = document.createElement('tr');
                if (row.ours) tr.className = 'ours';
                tr.appendChild(hel('td', null, row.name));
                DATASETS.forEach(({ key }) => {
                    tr.appendChild(hel('td', null, fmt4(row.v[key])));
                });
                tbody.appendChild(tr);
            });
            tbl.appendChild(tbody);
            $table.innerHTML = '';
            $table.appendChild(tbl);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    //  2.  VISION MULTI-PANEL
    // ─────────────────────────────────────────────────────────────────────
    function renderVisionPanels() {
        const $cfGrid  = document.getElementById('vision-cf-grid');
        const $ldsGrid = document.getElementById('vision-lds-grid');
        const $legend  = document.getElementById('vision-legend');
        const $tip     = document.getElementById('vision-tooltip');
        if (!$cfGrid || !$ldsGrid || !$legend || !$tip) return;

        const KS = [50, 100, 500, 1000, 2000];
        const K_LABELS = ['50', '100', '500', '1k', '2k'];

        const METHODS = [
            { name: 'STRIDE',  ours: true },
            { name: 'TRAK'    },
            { name: 'TracIn'  },
            { name: 'LoGRA'   },
            { name: 'FeatSim' },
            { name: 'Random'  },
        ];

        const CF = {
            'MNIST (MLP)': {
                STRIDE:  [0.1586, 0.1956, 0.3484, 0.4750, 0.6521],
                TRAK:    [-0.0141, -0.0126, -0.0062, 0.0204, 0.0070],
                TracIn:  [0.0360, 0.0473, 0.3301, 0.6317, 0.8573],
                LoGRA:   [0.0651, 0.0932, 0.4016, 0.6839, 0.8231],
                FeatSim: [0.0641, 0.0665, 0.8250, 0.8995, 0.9018],
                Random:  [0.0090, 0.0063, 0.0019, -0.0140, 0.0148],
            },
            'FashionMNIST (MLP)': {
                STRIDE:  [0.0468, 0.0455, 0.0859, 0.0969, 0.1443],
                TRAK:    [0.0721, 0.0989, 0.1883, 0.2562, 0.3234],
                TracIn:  [0.0091, -0.0251, 0.0486, 0.0917, 0.1534],
                LoGRA:   [0.0019, -0.0138, 0.1133, 0.1504, 0.1906],
                FeatSim: [-0.0185, -0.0110, 0.0408, 0.0820, 0.1012],
                Random:  [-0.0176, -0.0006, -0.0164, -0.0050, 0.0053],
            },
            'FashionMNIST (small MLP)': {
                STRIDE:  [0.0624, 0.0688, 0.1054, 0.1190, 0.1539],
                TRAK:    [0.0605, 0.1072, 0.2953, 0.3119, 0.4075],
                TracIn:  [0.0127, -0.0011, 0.0628, 0.0788, 0.1438],
                LoGRA:   [0.0207, 0.0343, 0.0742, 0.1352, 0.1830],
                FeatSim: [0.0189, -0.0229, 0.0310, 0.0694, 0.1707],
                Random:  [-0.0215, -0.0095, 0.0057, 0.0123, 0.0279],
            },
            'Parkinsons (MLP)': {
                STRIDE:  [0.2207, 0.2817, 0.5048, 0.6373, 0.7629],
                TRAK:    [0.0994, 0.0946, 0.1014, 0.0895, 0.1578],
                TracIn:  [0.1924, 0.2152, 0.3985, 0.5439, 0.7741],
                LoGRA:   [0.2316, 0.2806, 0.4950, 0.6186, 0.7822],
                FeatSim: [0.2097, 0.2759, 0.5254, 0.5972, 0.6037],
                Random:  [0.1078, 0.0996, 0.1221, 0.1300, 0.1868],
            },
        };

        const LDS = {
            'MNIST (MLP)':              { STRIDE: 0.4168, TRAK: 0.0115, TracIn: 0.1693, LoGRA: 0.3032, FeatSim: 0.0633 },
            'FashionMNIST (MLP)':       { STRIDE: 0.2309, TRAK: 0.1977, TracIn: 0.0828, LoGRA: 0.1234, FeatSim: -0.0078 },
            'FashionMNIST (small MLP)': { STRIDE: 0.2107, TRAK: 0.2260, TracIn: 0.0742, LoGRA: 0.1551, FeatSim:  0.0010 },
            'Parkinsons (MLP)':         { STRIDE: 0.5358, TRAK: -0.0074, TracIn: 0.3989, LoGRA: 0.4051, FeatSim: 0.1082 },
            'CIFAR-10 (ResNet-9)':      { STRIDE: 0.1295, TRAK: 0.0022,  TracIn: 0.1717, LoGRA: 0.2846, FeatSim: 0.0286 },
        };

        const hiddenMethods = new Set();
        const seriesGroups  = { cf: {}, lds: {} };

        // Tooltip helper.
        const tip = attachTooltip($tip, $cfGrid.parentElement.querySelector('svg, div')
            || $cfGrid, () => '');
        // Override tip helper to bind to the card container so coordinates are correct.
        const $card = $cfGrid.closest('.results-card');
        function showTip(evt, html) {
            $tip.innerHTML = html;
            const wrap = $card.getBoundingClientRect();
            $tip.style.left = (evt.clientX - wrap.left) + 'px';
            $tip.style.top  = (evt.clientY - wrap.top)  + 'px';
            $tip.classList.add('show');
        }
        function hideTip() { $tip.classList.remove('show'); }

        // ── CF panels: log x, line+marker, one panel per dataset.
        const W = 220, H = 150;
        const PAD = { l: 32, r: 8, t: 6, b: 28 };
        const xMin = Math.log10(KS[0]);
        const xMax = Math.log10(KS[KS.length - 1]);

        function cfX(k) {
            return PAD.l + (Math.log10(k) - xMin) / (xMax - xMin) * (W - PAD.l - PAD.r);
        }
        function cfY(v, yMin, yMax) {
            return H - PAD.b - (v - yMin) / (yMax - yMin) * (H - PAD.t - PAD.b);
        }

        $cfGrid.innerHTML = '';
        Object.keys(CF).forEach((ds) => {
            const panel = hel('div', { className: 'vision-panel' });
            const lines = ds.split('(');
            const title = hel('div', { className: 'vision-panel-title' });
            title.appendChild(hel('b', null, lines[0].trim()));
            if (lines[1]) title.appendChild(document.createTextNode('(' + lines[1]));
            panel.appendChild(title);

            const svg = el('svg', {
                viewBox: `0 0 ${W} ${H}`,
                preserveAspectRatio: 'xMidYMid meet',
                role: 'img',
                'aria-label': ds + ' counterfactual probability drop',
            });

            // Auto y-range across all methods for this dataset.
            const all = [].concat(...METHODS.map((m) => CF[ds][m.name] || []));
            const dataMin = Math.min(...all);
            const dataMax = Math.max(...all);
            const pad = (dataMax - dataMin) * 0.12 || 0.05;
            const yMin = Math.min(0, dataMin - pad);
            const yMax = dataMax + pad;

            // Grid lines at sensible y values.
            const yTicks = niceTicks(yMin, yMax, 4);
            yTicks.forEach((t) => {
                svg.appendChild(el('line', {
                    x1: PAD.l, y1: cfY(t, yMin, yMax),
                    x2: W - PAD.r, y2: cfY(t, yMin, yMax),
                    class: 'results-grid-line',
                }));
                svg.appendChild(el('text', {
                    x: PAD.l - 5, y: cfY(t, yMin, yMax) + 3,
                    'text-anchor': 'end',
                    class: 'results-tick-label',
                }, fmtTick(t)));
            });
            // Zero line.
            if (yMin < 0 && yMax > 0) {
                svg.appendChild(el('line', {
                    x1: PAD.l, y1: cfY(0, yMin, yMax),
                    x2: W - PAD.r, y2: cfY(0, yMin, yMax),
                    class: 'results-axis-line',
                }));
            }
            // x-axis ticks.
            KS.forEach((k, i) => {
                svg.appendChild(el('text', {
                    x: cfX(k), y: H - PAD.b + 14,
                    'text-anchor': 'middle',
                    class: 'results-tick-label',
                }, K_LABELS[i]));
            });
            // x-axis label.
            svg.appendChild(el('text', {
                x: (PAD.l + W - PAD.r) / 2,
                y: H - 4,
                class: 'results-axis-label x',
            }, 'top-k removed'));

            // Series.
            METHODS.forEach((m) => {
                if (!CF[ds][m.name]) return;
                const color = COLORS[m.name] || '#aaa';
                const g = el('g', { class: 'vision-series', 'data-method': m.name });

                const pts = KS.map((k, i) => [cfX(k), cfY(CF[ds][m.name][i], yMin, yMax)]);
                const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ');
                g.appendChild(el('path', {
                    d, fill: 'none', stroke: color,
                    'stroke-width': m.ours ? 2.4 : 1.6,
                    class: 'vision-series-line' + (m.ours ? ' ours' : ''),
                }));
                pts.forEach((p, i) => {
                    const dot = el('circle', {
                        cx: p[0], cy: p[1],
                        r: m.ours ? 3.2 : 2.6,
                        fill: color, class: 'vision-series-dot',
                        style: `color: ${color};`,
                    });
                    const v = CF[ds][m.name][i];
                    dot.addEventListener('mouseenter', (evt) => {
                        showTip(evt, `
                            <div class="rtt-method"><span class="rtt-swatch" style="background:${color}"></span>${m.name}</div>
                            <div class="rtt-row"><span>${ds}</span></div>
                            <div class="rtt-row"><span>top-k</span><b>${K_LABELS[i]}</b></div>
                            <div class="rtt-row"><span>Mean prob. drop</span><b>${fmt4(v)}</b></div>
                        `);
                    });
                    dot.addEventListener('mousemove', (evt) => {
                        const wrap = $card.getBoundingClientRect();
                        $tip.style.left = (evt.clientX - wrap.left) + 'px';
                        $tip.style.top  = (evt.clientY - wrap.top)  + 'px';
                    });
                    dot.addEventListener('mouseleave', hideTip);
                    g.appendChild(dot);
                });
                svg.appendChild(g);
                if (!seriesGroups.cf[m.name]) seriesGroups.cf[m.name] = [];
                seriesGroups.cf[m.name].push(g);
            });
            panel.appendChild(svg);
            $cfGrid.appendChild(panel);
        });

        // ── LDS panels: bar chart per dataset.
        const Wb = 220, Hb = 150;
        const PADb = { l: 32, r: 8, t: 6, b: 60 };
        const ldsMethods = METHODS.filter((m) => m.name !== 'Random');

        $ldsGrid.innerHTML = '';
        Object.keys(LDS).forEach((ds) => {
            const panel = hel('div', { className: 'vision-panel' });
            const lines = ds.split('(');
            const title = hel('div', { className: 'vision-panel-title' });
            title.appendChild(hel('b', null, lines[0].trim()));
            if (lines[1]) title.appendChild(document.createTextNode('(' + lines[1]));
            panel.appendChild(title);

            const svg = el('svg', {
                viewBox: `0 0 ${Wb} ${Hb}`,
                preserveAspectRatio: 'xMidYMid meet',
                role: 'img',
                'aria-label': ds + ' LDS Spearman correlation',
            });

            const values = ldsMethods.map((m) => LDS[ds][m.name]);
            const dataMin = Math.min(...values);
            const dataMax = Math.max(...values);
            const pad = (dataMax - dataMin) * 0.18 || 0.05;
            const yMin = Math.min(0, dataMin - pad);
            const yMax = dataMax + pad;

            const yTicks = niceTicks(yMin, yMax, 4);
            yTicks.forEach((t) => {
                const y = Hb - PADb.b - (t - yMin) / (yMax - yMin) * (Hb - PADb.t - PADb.b);
                svg.appendChild(el('line', {
                    x1: PADb.l, y1: y, x2: Wb - PADb.r, y2: y,
                    class: 'results-grid-line',
                }));
                svg.appendChild(el('text', {
                    x: PADb.l - 5, y: y + 3,
                    'text-anchor': 'end',
                    class: 'results-tick-label',
                }, fmtTick(t)));
            });
            // Zero line.
            if (yMin < 0) {
                const yZero = Hb - PADb.b - (0 - yMin) / (yMax - yMin) * (Hb - PADb.t - PADb.b);
                svg.appendChild(el('line', {
                    x1: PADb.l, y1: yZero, x2: Wb - PADb.r, y2: yZero,
                    class: 'results-axis-line',
                }));
            }

            const bw = (Wb - PADb.l - PADb.r) / ldsMethods.length * 0.74;
            const gap = (Wb - PADb.l - PADb.r) / ldsMethods.length;
            ldsMethods.forEach((m, i) => {
                const v = LDS[ds][m.name];
                const color = COLORS[m.name] || '#aaa';
                const x = PADb.l + (i + 0.5) * gap - bw / 2;
                const yZero = Hb - PADb.b - (0 - yMin) / (yMax - yMin) * (Hb - PADb.t - PADb.b);
                const yBar  = Hb - PADb.b - (v - yMin) / (yMax - yMin) * (Hb - PADb.t - PADb.b);
                const top = Math.min(yBar, yZero);
                const h = Math.abs(yBar - yZero);

                const g = el('g', { class: 'vision-series', 'data-method': m.name });
                const rect = el('rect', {
                    x, y: top, width: bw, height: h,
                    fill: color, rx: 2, ry: 2,
                    class: 'vision-series-bar' + (m.ours ? ' ours' : ''),
                    style: `color: ${color};`,
                });
                rect.addEventListener('mouseenter', (evt) => {
                    showTip(evt, `
                        <div class="rtt-method"><span class="rtt-swatch" style="background:${color}"></span>${m.name}</div>
                        <div class="rtt-row"><span>${ds}</span></div>
                        <div class="rtt-row"><span>LDS Spearman</span><b>${fmt4(v)}</b></div>
                    `);
                });
                rect.addEventListener('mousemove', (evt) => {
                    const wrap = $card.getBoundingClientRect();
                    $tip.style.left = (evt.clientX - wrap.left) + 'px';
                    $tip.style.top  = (evt.clientY - wrap.top)  + 'px';
                });
                rect.addEventListener('mouseleave', hideTip);
                g.appendChild(rect);

                // method label below bar.
                svg.appendChild(el('text', {
                    x: x + bw / 2, y: Hb - PADb.b + 12,
                    'text-anchor': 'end',
                    transform: `rotate(-40 ${x + bw / 2} ${Hb - PADb.b + 12})`,
                    class: 'results-tick-label',
                    style: m.ours ? `fill:${ACCENT};font-weight:600;` : '',
                }, m.name));

                svg.appendChild(g);
                if (!seriesGroups.lds[m.name]) seriesGroups.lds[m.name] = [];
                seriesGroups.lds[m.name].push(g);
            });

            panel.appendChild(svg);
            $ldsGrid.appendChild(panel);
        });

        // ── Legend (shared across CF + LDS panels).
        $legend.innerHTML = '';
        METHODS.forEach((m) => {
            const color = COLORS[m.name] || '#aaa';
            const li = document.createElement('li');
            if (m.ours) li.classList.add('ours');
            const sw = document.createElement('span');
            sw.className = 'swatch';
            sw.style.background = color;
            li.appendChild(sw);
            li.appendChild(document.createTextNode(m.name));
            li.addEventListener('click', () => {
                const hide = !li.classList.contains('hidden');
                li.classList.toggle('hidden', hide);
                if (hide) hiddenMethods.add(m.name); else hiddenMethods.delete(m.name);
                (seriesGroups.cf[m.name] || []).forEach((g) => g.classList.toggle('hidden', hide));
                (seriesGroups.lds[m.name] || []).forEach((g) => g.classList.toggle('hidden', hide));
            });
            $legend.appendChild(li);
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    //  3.  SELECTION LOLLIPOP
    // ─────────────────────────────────────────────────────────────────────
    function renderSelectionLollipop() {
        const $svg = document.getElementById('selection-chart');
        if (!$svg) return;

        const ROWS = [
            { name: 'Random',  v: 42.97, std: 23.46 },
            { name: 'TF-IDF',  v: 49.47, std: 22.56 },
            { name: 'LESS',    v: 49.51, std: 23.50 },
            { name: 'STRIDE',  v: 49.65, std: 22.08, ours: true },
            { name: 'AirRep',  v: 49.66, std: 22.15 },
            { name: 'LoGRA',   v: 49.94, std: 23.82 },
        ];

        ROWS.sort((a, b) => a.v - b.v);
        const baseline = 42.97;

        const W = 820, H = 320;
        const PAD = { l: 110, r: 130, t: 28, b: 44 };
        const xMin = 40, xMax = 52;

        const xScale = (v) => PAD.l + (v - xMin) / (xMax - xMin) * (W - PAD.l - PAD.r);
        const yScale = (i) => PAD.t + (i + 0.5) * (H - PAD.t - PAD.b) / ROWS.length;

        $svg.innerHTML = '';

        // grid + ticks  ("52" dropped: leaves clean space for the right-margin
        // "order of magnitude faster" callout pill).
        [42, 44, 46, 48, 50].forEach((t) => {
            $svg.appendChild(el('line', {
                x1: xScale(t), y1: PAD.t,
                x2: xScale(t), y2: H - PAD.b,
                class: 'results-grid-line',
            }));
            $svg.appendChild(el('text', {
                x: xScale(t), y: H - PAD.b + 18,
                'text-anchor': 'middle',
                class: 'results-tick-label',
            }, t.toString()));
        });

        // axis label
        $svg.appendChild(el('text', {
            x: (PAD.l + W - PAD.r) / 2,
            y: H - 8,
            class: 'results-axis-label x',
        }, 'Mean unigram F1 (66 FLAN tasks)'));

        // Baseline reference line + label.
        $svg.appendChild(el('line', {
            x1: xScale(baseline), y1: PAD.t,
            x2: xScale(baseline), y2: H - PAD.b,
            class: 'results-baseline-line',
        }));
        $svg.appendChild(el('text', {
            x: xScale(baseline) + 4, y: PAD.t + 12,
            class: 'results-baseline-label',
        }, 'random baseline'));

        // Rows.
        const RIGHT_OF_DOT = 8;
        ROWS.forEach((r, i) => {
            const y = yScale(i);
            const color = COLORS[r.name] || '#aaa';

            // method label on the left
            $svg.appendChild(el('text', {
                x: PAD.l - 10, y: y + 4,
                'text-anchor': 'end',
                class: 'selection-method-label' + (r.ours ? ' ours' : ''),
            }, r.name));

            // stem from baseline -> value (or value -> baseline if below baseline)
            const xStart = xScale(Math.min(r.v, baseline));
            const xEnd   = xScale(Math.max(r.v, baseline));
            if (Math.abs(r.v - baseline) > 1e-3) {
                $svg.appendChild(el('line', {
                    x1: xStart, y1: y, x2: xEnd, y2: y,
                    stroke: color,
                    class: 'selection-stem' + (r.ours ? ' ours' : ''),
                    opacity: r.ours ? 0.85 : 0.4,
                }));
            }

            // dot
            const dot = el('circle', {
                cx: xScale(r.v), cy: y, r: r.ours ? 8 : 6,
                fill: color, class: 'selection-dot' + (r.ours ? ' ours' : ''),
                style: `color: ${color};`,
            });
            dot.addEventListener('mouseenter', (evt) => {
                const card = $svg.closest('.results-card');
                const wrap = card.getBoundingClientRect();
                let tip = card.querySelector('.results-tooltip');
                if (!tip) {
                    tip = document.createElement('div');
                    tip.className = 'results-tooltip';
                    card.appendChild(tip);
                }
                tip.innerHTML = `
                    <div class="rtt-method"><span class="rtt-swatch" style="background:${color}"></span>${r.name}</div>
                    <div class="rtt-row"><span>Unigram F1</span><b>${r.v.toFixed(2)}</b></div>
                    <div class="rtt-row"><span>Std. dev.</span><b>&plusmn;${r.std.toFixed(2)}</b></div>
                    <div class="rtt-row"><span>vs. random</span><b>+${(r.v - baseline).toFixed(2)}</b></div>
                `;
                tip.style.left = (evt.clientX - wrap.left) + 'px';
                tip.style.top  = (evt.clientY - wrap.top)  + 'px';
                tip.classList.add('show');
            });
            dot.addEventListener('mousemove', (evt) => {
                const card = $svg.closest('.results-card');
                const wrap = card.getBoundingClientRect();
                const tip = card.querySelector('.results-tooltip');
                if (tip) {
                    tip.style.left = (evt.clientX - wrap.left) + 'px';
                    tip.style.top  = (evt.clientY - wrap.top)  + 'px';
                }
            });
            dot.addEventListener('mouseleave', () => {
                const tip = $svg.closest('.results-card').querySelector('.results-tooltip');
                if (tip) tip.classList.remove('show');
            });
            $svg.appendChild(dot);

            // numeric label to the right of dot
            $svg.appendChild(el('text', {
                x: xScale(r.v) + (r.ours ? 14 : 11),
                y: y + 4,
                class: 'selection-value-label' + (r.ours ? ' ours' : ''),
            }, r.v.toFixed(2)));
        });

        // STRIDE callout pill — anchored just outside the right margin.
        // Two-line text so the wider phrase fits without overflowing the SVG.
        const strideIdx = ROWS.findIndex((r) => r.ours);
        if (strideIdx >= 0) {
            const yo = yScale(strideIdx);
            const xo = W - PAD.r + 8;
            const pillH = 36, pillW = 112;
            $svg.appendChild(el('rect', {
                x: xo, y: yo - pillH / 2,
                width: pillW, height: pillH, rx: 18, ry: 18,
                class: 'selection-callout',
            }));
            $svg.appendChild(el('text', {
                x: xo + pillW / 2, y: yo - 3,
                'text-anchor': 'middle',
                class: 'selection-callout-text',
            }, 'order of magnitude'));
            $svg.appendChild(el('text', {
                x: xo + pillW / 2, y: yo + 12,
                'text-anchor': 'middle',
                class: 'selection-callout-text',
            }, 'faster'));
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    //  4.  CONTAMINATION — staircase recall  +  dumbbell gap
    // ─────────────────────────────────────────────────────────────────────
    function renderContaminationPanels() {
        const $svgR = document.getElementById('contam-chart-recall');
        const $svgG = document.getElementById('contam-chart-gap');
        if (!$svgR || !$svgG) return;

        // ── Left panel: staircase bars for recall.
        const BARS = [
            { label: 'Random',          v: 1.1,  color: '#9e9e9e', icon: '🎲', sub: 'chance' },
            { label: 'LoGRA',           v: 62.1, color: COLORS.LoGRA, icon: '∇',  sub: 'gradient' },
            { label: 'LoGRA + STRIDE',  v: 74.2, color: ACCENT, icon: '✦',  sub: 'gradient + activation', ours: true },
        ];

        {
            const W = 420, H = 320;
            // Extra headroom at the top so the +12.1 pp arc sits well above
            // the bar value labels instead of crossing them.
            const PAD = { l: 44, r: 18, t: 50, b: 78 };
            const yMin = 0, yMax = 100;
            const yScale = (v) => H - PAD.b - (v - yMin) / (yMax - yMin) * (H - PAD.t - PAD.b);
            const bw = (W - PAD.l - PAD.r) / BARS.length * 0.55;
            const xStep = (W - PAD.l - PAD.r) / BARS.length;

            $svgR.innerHTML = '';
            [0, 25, 50, 75, 100].forEach((t) => {
                $svgR.appendChild(el('line', {
                    x1: PAD.l, y1: yScale(t), x2: W - PAD.r, y2: yScale(t),
                    class: 'results-grid-line',
                }));
                $svgR.appendChild(el('text', {
                    x: PAD.l - 6, y: yScale(t) + 3,
                    'text-anchor': 'end',
                    class: 'results-tick-label',
                }, t + '%'));
            });
            $svgR.appendChild(el('text', {
                x: 14, y: (PAD.t + H - PAD.b) / 2,
                'text-anchor': 'middle',
                transform: `rotate(-90 14 ${(PAD.t + H - PAD.b) / 2})`,
                class: 'results-axis-label y',
            }, 'Recall (%)'));

            BARS.forEach((b, i) => {
                const xc = PAD.l + (i + 0.5) * xStep;
                const yTop = yScale(b.v);
                const yBot = yScale(0);
                const x = xc - bw / 2;

                // The +12.1pp segment on the third bar is rendered as a brighter
                // overlay so the delta has its own visual weight.
                if (b.ours) {
                    const split = yScale(BARS[1].v);
                    $svgR.appendChild(el('rect', {
                        x, y: split, width: bw, height: yBot - split,
                        fill: b.color, opacity: 0.55, rx: 3, ry: 3,
                        class: 'contam-bar',
                    }));
                    $svgR.appendChild(el('rect', {
                        x, y: yTop, width: bw, height: split - yTop,
                        fill: b.color, opacity: 1, rx: 3, ry: 3,
                        class: 'contam-bar',
                    }));
                } else {
                    $svgR.appendChild(el('rect', {
                        x, y: yTop, width: bw, height: yBot - yTop,
                        fill: b.color, opacity: b.label === 'Random' ? 0.55 : 0.85,
                        rx: 3, ry: 3, class: 'contam-bar',
                    }));
                }

                // value above bar
                $svgR.appendChild(el('text', {
                    x: xc, y: yTop - 8,
                    class: 'contam-bar-value' + (b.ours ? ' ours' : ''),
                }, b.v.toFixed(1) + '%'));

                // label below bar
                $svgR.appendChild(el('text', {
                    x: xc, y: yBot + 22,
                    class: 'contam-bar-label',
                }, b.label));
                // icon row
                $svgR.appendChild(el('text', {
                    x: xc, y: yBot + 44,
                    class: 'contam-icon',
                }, b.icon));
                $svgR.appendChild(el('text', {
                    x: xc, y: yBot + 60,
                    class: 'contam-bar-sub',
                }, b.sub));
            });

            // Delta arrow from bar 2 top to bar 3 top.  Endpoints are lifted
            // well above the bar value labels (which sit at yTop - 8) so the
            // curve never crosses the "62.1%" / "74.2%" numbers.
            const xc2 = PAD.l + 1.5 * xStep;
            const xc3 = PAD.l + 2.5 * xStep;
            const yTop2 = yScale(BARS[1].v);
            const yTop3 = yScale(BARS[2].v);
            const ARROW_LIFT = 34;
            const yStart = yTop2 - ARROW_LIFT;
            const yEnd   = yTop3 - ARROW_LIFT;
            const arcMid = (yStart + yEnd) / 2 - 14;
            $svgR.appendChild(el('path', {
                d: `M${xc2 + 6} ${yStart} Q${(xc2 + xc3) / 2} ${arcMid} ${xc3 - 6} ${yEnd}`,
                class: 'contam-delta-arrow',
            }));
            // arrow head — anchored at the lifted endpoint
            $svgR.appendChild(el('polygon', {
                points: `${xc3 - 6},${yEnd} ${xc3 - 13},${yEnd + 5} ${xc3 - 13},${yEnd - 5}`,
                fill: ACCENT,
            }));
            $svgR.appendChild(el('text', {
                x: (xc2 + xc3) / 2, y: arcMid - 5,
                class: 'contam-bar-delta',
            }, '+12.1 pp'));
        }

        // ── Right panel: dumbbell plot for memorization gap.
        const RATES = [
            { rate: '0.5 %', clean: 11.2, leaked: 81.8 },
            { rate: '1.0 %', clean: 11.5, leaked: 85.9 },
            { rate: '1.5 %', clean:  9.7, leaked: 89.7 },
        ];

        {
            const W = 420, H = 320;
            const PAD = { l: 70, r: 26, t: 26, b: 60 };
            const xMin = 0, xMax = 100;
            const xScale = (v) => PAD.l + (v - xMin) / (xMax - xMin) * (W - PAD.l - PAD.r);
            const yStep = (H - PAD.t - PAD.b) / RATES.length;
            const yScale = (i) => PAD.t + (i + 0.5) * yStep;

            $svgG.innerHTML = '';
            // grid
            [0, 25, 50, 75, 100].forEach((t) => {
                $svgG.appendChild(el('line', {
                    x1: xScale(t), y1: PAD.t,
                    x2: xScale(t), y2: H - PAD.b,
                    class: 'results-grid-line',
                }));
                $svgG.appendChild(el('text', {
                    x: xScale(t), y: H - PAD.b + 16,
                    'text-anchor': 'middle',
                    class: 'results-tick-label',
                }, t + '%'));
            });
            // clean-base reference at ~12% (Qwen-2.5-0.5B base)
            $svgG.appendChild(el('line', {
                x1: xScale(12.8), y1: PAD.t,
                x2: xScale(12.8), y2: H - PAD.b,
                class: 'results-baseline-line',
            }));
            $svgG.appendChild(el('text', {
                x: xScale(12.8) + 4, y: PAD.t + 12,
                class: 'results-baseline-label',
            }, 'clean base ≈ 12.8%'));

            $svgG.appendChild(el('text', {
                x: (PAD.l + W - PAD.r) / 2,
                y: H - 10,
                class: 'results-axis-label x',
            }, 'MATH accuracy'));

            RATES.forEach((r, i) => {
                const y = yScale(i);

                // row label
                $svgG.appendChild(el('text', {
                    x: PAD.l - 10, y: y + 4,
                    'text-anchor': 'end',
                    class: 'contam-row-label',
                }, r.rate));
                $svgG.appendChild(el('text', {
                    x: PAD.l - 10, y: y + 18,
                    'text-anchor': 'end',
                    class: 'results-tick-label',
                }, 'leak rate'));

                // connecting bar
                const xC = xScale(r.clean);
                const xL = xScale(r.leaked);
                $svgG.appendChild(el('line', {
                    x1: xC, y1: y, x2: xL, y2: y,
                    class: 'contam-dumbbell-line' + (i === RATES.length - 1 ? ' ours' : ''),
                    stroke: ACCENT, opacity: 0.45 + i * 0.15,
                }));

                // clean dot (muted)
                $svgG.appendChild(el('circle', {
                    cx: xC, cy: y, r: 6,
                    fill: '#888',
                    class: 'contam-dumbbell-dot',
                    style: 'color: #888;',
                }));
                $svgG.appendChild(el('text', {
                    x: xC, y: y - 12,
                    'text-anchor': 'middle',
                    class: 'results-tick-label',
                }, r.clean.toFixed(1) + '%'));

                // leaked dot (accent)
                $svgG.appendChild(el('circle', {
                    cx: xL, cy: y, r: 8,
                    fill: ACCENT,
                    class: 'contam-dumbbell-dot',
                    style: `color: ${ACCENT};`,
                }));
                $svgG.appendChild(el('text', {
                    x: xL, y: y - 14,
                    'text-anchor': 'middle',
                    class: 'contam-bar-value ours',
                }, r.leaked.toFixed(1) + '%'));
            });

            // legend strip under the plot
            const lx = PAD.l, ly = H - 24;
            $svgG.appendChild(el('circle', {
                cx: lx, cy: ly, r: 5, fill: '#888',
            }));
            $svgG.appendChild(el('text', {
                x: lx + 10, y: ly + 4,
                class: 'results-tick-label',
            }, 'non-leaked'));
            $svgG.appendChild(el('circle', {
                cx: lx + 110, cy: ly, r: 6, fill: ACCENT,
            }));
            $svgG.appendChild(el('text', {
                x: lx + 122, y: ly + 4,
                class: 'results-tick-label',
            }, 'leaked'));
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Shared utilities
    // ─────────────────────────────────────────────────────────────────────
    function niceTicks(lo, hi, target) {
        const span = hi - lo;
        if (span <= 0) return [lo];
        const rough = span / target;
        const exp = Math.floor(Math.log10(rough));
        const frac = rough / Math.pow(10, exp);
        let step;
        if (frac < 1.5)      step = 1;
        else if (frac < 3.5) step = 2;
        else if (frac < 7.5) step = 5;
        else                 step = 10;
        step *= Math.pow(10, exp);
        const ticks = [];
        const start = Math.ceil(lo / step) * step;
        for (let v = start; v <= hi + 1e-9; v += step) {
            ticks.push(Math.abs(v) < 1e-9 ? 0 : Number(v.toFixed(6)));
        }
        return ticks;
    }
    function fmtTick(v) {
        if (Math.abs(v) >= 1)   return v.toFixed(1);
        if (Math.abs(v) >= 0.1) return v.toFixed(2);
        return v.toFixed(2);
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Boot
    // ─────────────────────────────────────────────────────────────────────
    function boot() {
        try { renderSftScorecard();        } catch (e) { console.error('SFT chart failed', e); }
        try { renderVisionPanels();        } catch (e) { console.error('Vision panels failed', e); }
        try { renderSelectionLollipop();   } catch (e) { console.error('Selection chart failed', e); }
        try { renderContaminationPanels(); } catch (e) { console.error('Contamination panels failed', e); }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
