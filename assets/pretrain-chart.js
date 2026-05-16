// ── Pretraining LDS interactive bubble chart ─────────────────────────────
// Three plots sharing a model-size x-axis:
//   - Left:  LDS vs model size (per-model values, no extrapolation)
//   - Right top:    end-to-end runtime  (per-model values, log y)
//   - Right bottom: peak GPU memory     (per-model values, linear y)
//
// Per-model runtime / VRAM values:
//   - STRIDE: from appendix Table tab:stride_runtime_memory.
//   - All 6 methods at 1.38B: from main Table tab:lds_pretrain.
//   - Smaller model sizes: extracted from fig:scaling (scalability_plot.pdf),
//     since the SteerInfluence repo doesn't check in the source data / script
//     that produced that figure.
//   - AirRep at 1.38B is extrapolated (did not complete) — we mark its 1.38B
//     point with 💥.  AirRep (PT) has no per-model scaling data in the paper,
//     so we only render it in the LDS plot.
(function () {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const $svgLds     = document.getElementById('pretrain-chart-lds');
    const $svgRuntime = document.getElementById('pretrain-chart-runtime');
    const $svgGpu     = document.getElementById('pretrain-chart-gpu');
    const $tip        = document.getElementById('pretrain-tooltip');
    const $legend     = document.getElementById('pretrain-legend');
    if (!$svgLds || !$svgRuntime || !$svgGpu || !$tip || !$legend) return;

    const MODELS = [
        { label: '286M',  tokens: '2.7B tokens'  },
        { label: '537M',  tokens: '5.8B tokens'  },
        { label: '897M',  tokens: '10.9B tokens' },
        { label: '1.38B', tokens: '18.2B tokens' },
    ];

    const METHODS = [
        {
            name: 'RDS', color: '#9e9e9e',
            points:  [
                { lds: 0.0691, std: 0.0525 },
                { lds: 0.0748, std: 0.0205 },
                { lds: 0.0695, std: 0.0294 },
                { lds: 0.0742, std: 0.0479 },
            ],
            runtime: [1.2,  2.5,  9.0,  24.05],
            gpu:     [4.5,  5.5,  8.3,  11.62],
        },
        {
            name: 'TF-IDF', color: '#b08bff',
            points:  [
                { lds: 0.0842, std: 0.0626 },
                { lds: 0.0951, std: 0.0571 },
                { lds: 0.0864, std: 0.0603 },
                { lds: 0.0893, std: 0.0553 },
            ],
            runtime: [1.0,  2.5,  5.0,  8.28],
            gpu:     [0.0,  0.0,  0.0,  0.0],
        },
        {
            name: 'GTE', color: '#66bb6a',
            points:  [
                { lds: 0.1006, std: 0.0551 },
                { lds: 0.1132, std: 0.0452 },
                { lds: 0.1028, std: 0.0402 },
                { lds: 0.1284, std: 0.0393 },
            ],
            runtime: [0.43, 0.95, 1.78, 2.99],
            gpu:     [7.02, 7.02, 7.02, 7.02],
        },
        {
            name: 'LoGRA', color: '#ef5350',
            points:  [
                { lds: 0.1126, std: 0.0630 },
                { lds: 0.1272, std: 0.0618 },
                { lds: 0.1138, std: 0.0512 },
                { lds: 0.1139, std: 0.0489 },
            ],
            runtime: [1.7,  4.0,  16.0, 52.3],
            gpu:     [2.5,  6.0,  10.5, 17.74],
        },
        {
            name: 'AirRep (PT)', color: '#ffb74d',
            points:  [
                { lds: 0.1108, std: 0.0588 },
                { lds: 0.1259, std: 0.0582 },
                { lds: 0.1112, std: 0.0489 },
                { infeasible: true },
            ],
            // No per-model runtime / VRAM in the scaling figure → omit from
            // the cost plots.
            runtime: null,
            gpu:     null,
        },
        {
            name: 'AirRep', color: '#ff7043',
            points:  [
                { lds: 0.1406, std: 0.0678 },
                { lds: 0.1592, std: 0.0633 },
                { lds: 0.1438, std: 0.0622 },
                { infeasible: true },
            ],
            runtime: [3.5,  6.0,  16.0, 116.1],
            gpu:     [6.0,  6.0,  6.0,  6.02],
            // 💥 marker on the 1.38B end of the cost curves.
            infeasibleAt: 3,
        },
        {
            name: 'STRIDE', color: '#4FC3F7', ours: true,
            points:  [
                { lds: 0.1581, std: 0.0740 },
                { lds: 0.1792, std: 0.0860 },
                { lds: 0.1598, std: 0.1010 },
                { lds: 0.1671, std: 0.1310 },
            ],
            runtime: [2.55, 4.73, 7.27, 9.93],
            gpu:     [2.33, 3.18, 5.27, 8.41],
        },
    ];

    // ── Layout: LDS plot ─────────────────────────────────────────────────
    const LDS = { W: 560, H: 500, M: { top: 24, right: 24, bottom: 70, left: 78 } };
    LDS.plotW = LDS.W - LDS.M.left - LDS.M.right;
    LDS.plotH = LDS.H - LDS.M.top - LDS.M.bottom;
    const Y_MIN = 0.05, Y_MAX = 0.20;
    const yForLds = (lds) => LDS.M.top + (1 - (lds - Y_MIN) / (Y_MAX - Y_MIN)) * LDS.plotH;
    const xForLds = (i)   => LDS.M.left + (LDS.plotW / MODELS.length) * (i + 0.5);

    // ── Layout: cost plots (right column) ────────────────────────────────
    const COST = { W: 380, H: 240, M: { top: 18, right: 22, bottom: 36, left: 50 } };
    COST.plotW = COST.W - COST.M.left - COST.M.right;
    COST.plotH = COST.H - COST.M.top - COST.M.bottom;
    const xForCost = (i) => COST.M.left + (COST.plotW / MODELS.length) * (i + 0.5);

    // Runtime: log scale, covers 0.3 h .. 200 h
    const RT_LO = 0.3, RT_HI = 200;
    const lRtLo = Math.log10(RT_LO), lRtHi = Math.log10(RT_HI);
    const yForRuntime = (rt) =>
        COST.M.top + (1 - (Math.log10(rt) - lRtLo) / (lRtHi - lRtLo)) * COST.plotH;

    // GPU: linear, 0 .. 20 GiB
    const GPU_LO = 0, GPU_HI = 20;
    const yForGpu = (g) =>
        COST.M.top + (1 - (g - GPU_LO) / (GPU_HI - GPU_LO)) * COST.plotH;

    // ── Helpers ──────────────────────────────────────────────────────────
    const el = (tag, attrs, children) => {
        const e = document.createElementNS(SVG_NS, tag);
        if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
        if (children != null) {
            if (Array.isArray(children)) children.forEach(c => e.appendChild(c));
            else e.textContent = children;
        }
        return e;
    };

    // ── State ────────────────────────────────────────────────────────────
    const hiddenMethods = new Set();
    const seriesGroups  = {};   // method.name -> { lds, runtime, gpu }
    const ensureEntry   = (name) => (seriesGroups[name] = seriesGroups[name] || {});

    // ── LDS plot ─────────────────────────────────────────────────────────
    function renderLdsAxes() {
        const g = el('g', { class: 'pretrain-axes' });

        const yTicks = [0.05, 0.075, 0.10, 0.125, 0.15, 0.175, 0.20];
        yTicks.forEach((v) => {
            const y = yForLds(v);
            g.appendChild(el('line', {
                x1: LDS.M.left, x2: LDS.M.left + LDS.plotW, y1: y, y2: y,
                class: 'pretrain-grid-line',
            }));
            const major = (Math.round(v * 100) % 5) === 0;
            g.appendChild(el('text', {
                x: LDS.M.left - 10, y: y + 4,
                'text-anchor': 'end',
                class: 'pretrain-tick-label',
                opacity: major ? 1 : 0.55,
            }, v.toFixed(major ? 2 : 3)));
        });
        g.appendChild(el('text', {
            class: 'pretrain-axis-label y',
            transform: `translate(${LDS.M.left - 50}, ${LDS.M.top + LDS.plotH / 2}) rotate(-90)`,
        }, 'LDS  (higher is better)'));

        MODELS.forEach((m, i) => {
            const x = xForLds(i);
            g.appendChild(el('line', {
                x1: x, x2: x, y1: LDS.M.top, y2: LDS.M.top + LDS.plotH,
                class: 'pretrain-grid-line', opacity: 0.18,
            }));
            g.appendChild(el('text', {
                x, y: LDS.M.top + LDS.plotH + 22,
                'text-anchor': 'middle',
                class: 'pretrain-tick-label',
                'font-weight': 600,
            }, m.label));
            g.appendChild(el('text', {
                x, y: LDS.M.top + LDS.plotH + 40,
                'text-anchor': 'middle',
                class: 'pretrain-tick-label',
                'font-size': 11, opacity: 0.7,
            }, m.tokens));
        });

        g.appendChild(el('line', {
            x1: LDS.M.left, x2: LDS.M.left, y1: LDS.M.top, y2: LDS.M.top + LDS.plotH,
            class: 'pretrain-axis-line',
        }));
        g.appendChild(el('line', {
            x1: LDS.M.left, x2: LDS.M.left + LDS.plotW,
            y1: LDS.M.top + LDS.plotH, y2: LDS.M.top + LDS.plotH,
            class: 'pretrain-axis-line',
        }));
        g.appendChild(el('text', {
            class: 'pretrain-axis-label x',
            x: LDS.M.left + LDS.plotW / 2, y: LDS.M.top + LDS.plotH + 62,
        }, 'Model size  (nanochat parameters)'));

        $svgLds.appendChild(g);
    }

    function renderLdsSeries() {
        METHODS.forEach((method) => {
            const g = el('g', {
                class: 'pretrain-series' + (method.ours ? ' ours' : ''),
                'data-method': method.name,
            });
            if (hiddenMethods.has(method.name)) g.classList.add('hidden');

            // Lines: only between consecutive feasible LDS points.
            for (let i = 0; i < method.points.length - 1; i++) {
                const a = method.points[i], b = method.points[i + 1];
                if (a.infeasible || b.infeasible) continue;
                g.appendChild(el('line', {
                    x1: xForLds(i), y1: yForLds(a.lds),
                    x2: xForLds(i + 1), y2: yForLds(b.lds),
                    class: 'pretrain-series-line',
                    stroke: method.color,
                }));
            }

            method.points.forEach((p, i) => {
                if (p.infeasible) return;
                const r = method.ours ? 10 : 7;
                const circle = el('circle', {
                    cx: xForLds(i), cy: yForLds(p.lds), r,
                    class: 'pretrain-series-bubble' + (method.ours ? ' ours' : ''),
                    fill: method.color,
                    style: `color: ${method.color};`,
                });
                circle.dataset.method   = method.name;
                circle.dataset.modelIdx = i;
                circle.dataset.plot     = 'lds';
                g.appendChild(circle);
            });

            ensureEntry(method.name).lds = g;
            $svgLds.appendChild(g);
        });
    }

    // ── Cost plots (runtime + gpu) ───────────────────────────────────────
    function renderCostAxes($svg, kind) {
        const g = el('g', { class: 'pretrain-axes' });

        if (kind === 'runtime') {
            const ticks = [0.3, 1, 3, 10, 30, 100];
            ticks.forEach((v) => {
                const y = yForRuntime(v);
                g.appendChild(el('line', {
                    x1: COST.M.left, x2: COST.M.left + COST.plotW, y1: y, y2: y,
                    class: 'pretrain-grid-line',
                }));
                g.appendChild(el('text', {
                    x: COST.M.left - 6, y: y + 4,
                    'text-anchor': 'end',
                    class: 'pretrain-tick-label',
                }, v < 1 ? v.toFixed(1) + ' h' : v + ' h'));
            });
        } else {
            const ticks = [0, 5, 10, 15, 20];
            ticks.forEach((v) => {
                const y = yForGpu(v);
                g.appendChild(el('line', {
                    x1: COST.M.left, x2: COST.M.left + COST.plotW, y1: y, y2: y,
                    class: 'pretrain-grid-line',
                }));
                g.appendChild(el('text', {
                    x: COST.M.left - 6, y: y + 4,
                    'text-anchor': 'end',
                    class: 'pretrain-tick-label',
                }, v));
            });
        }

        MODELS.forEach((m, i) => {
            const x = xForCost(i);
            g.appendChild(el('line', {
                x1: x, x2: x, y1: COST.M.top, y2: COST.M.top + COST.plotH,
                class: 'pretrain-grid-line', opacity: 0.18,
            }));
            g.appendChild(el('text', {
                x, y: COST.M.top + COST.plotH + 18,
                'text-anchor': 'middle',
                class: 'pretrain-tick-label',
                'font-size': 11,
            }, m.label));
        });

        g.appendChild(el('line', {
            x1: COST.M.left, x2: COST.M.left, y1: COST.M.top, y2: COST.M.top + COST.plotH,
            class: 'pretrain-axis-line',
        }));
        g.appendChild(el('line', {
            x1: COST.M.left, x2: COST.M.left + COST.plotW,
            y1: COST.M.top + COST.plotH, y2: COST.M.top + COST.plotH,
            class: 'pretrain-axis-line',
        }));

        $svg.appendChild(g);
    }

    function renderCostSeries($svg, kind) {
        const yFor   = kind === 'runtime' ? yForRuntime : yForGpu;
        const valsOf = (m) => kind === 'runtime' ? m.runtime : m.gpu;
        // STRIDE last so it sits on top.
        const ordered = METHODS.slice().sort((a, b) => (a.ours ? 1 : 0) - (b.ours ? 1 : 0));

        ordered.forEach((method) => {
            const vals = valsOf(method);
            if (!vals) return;   // method has no per-model cost data (AirRep (PT))

            const g = el('g', {
                class: 'pretrain-series' + (method.ours ? ' ours' : ''),
                'data-method': method.name,
            });
            if (hiddenMethods.has(method.name)) g.classList.add('hidden');

            for (let i = 0; i < vals.length - 1; i++) {
                g.appendChild(el('line', {
                    x1: xForCost(i),     y1: yFor(vals[i]),
                    x2: xForCost(i + 1), y2: yFor(vals[i + 1]),
                    class: 'pretrain-series-line',
                    stroke: method.color,
                }));
            }

            vals.forEach((v, i) => {
                const extrapHere = method.infeasibleAt === i;
                const r = method.ours ? 7 : 5;
                const circle = el('circle', {
                    cx: xForCost(i), cy: yFor(v), r,
                    class: 'pretrain-series-bubble'
                        + (method.ours ? ' ours' : '')
                        + (extrapHere ? ' estimated' : ''),
                    fill: method.color,
                    style: `color: ${method.color};`,
                });
                circle.dataset.method   = method.name;
                circle.dataset.modelIdx = i;
                circle.dataset.plot     = kind;
                g.appendChild(circle);

                if (extrapHere) {
                    g.appendChild(el('text', {
                        x: xForCost(i) + r + 1, y: yFor(v) - r + 2,
                        class: 'pretrain-bubble-blast',
                    }, '💥'));
                }
            });

            ensureEntry(method.name)[kind] = g;
            $svg.appendChild(g);
        });
    }

    // ── Initial render ───────────────────────────────────────────────────
    renderLdsAxes();
    renderLdsSeries();
    renderCostAxes($svgRuntime, 'runtime');
    renderCostSeries($svgRuntime, 'runtime');
    renderCostAxes($svgGpu, 'gpu');
    renderCostSeries($svgGpu, 'gpu');

    // ── Tooltip ──────────────────────────────────────────────────────────
    const $grid = $svgLds.closest('.pretrain-grid');

    function showTip(target) {
        const methodName = target.dataset.method;
        const method = METHODS.find(m => m.name === methodName);
        if (!method) return;
        const i = +target.dataset.modelIdx;
        const point = method.points[i];
        const model = MODELS[i];

        const oursTag = method.ours ? '<span class="ptt-tag ours">ours</span>' : '';

        let ldsRow;
        if (point && !point.infeasible) {
            ldsRow = `<div class="ptt-row ptt-lds"><span>LDS</span><b>${point.lds.toFixed(4)}</b>${
                point.std != null ? ` <span style="opacity:0.65;">±${point.std.toFixed(4)}</span>` : ''
              }</div>`;
        } else {
            ldsRow = `<div class="ptt-row ptt-lds"><span>LDS</span><b>did not complete</b></div>`;
        }

        const rtVal  = method.runtime ? method.runtime[i].toFixed(2) + ' h'   : '—';
        const gpuVal = method.gpu     ? method.gpu[i].toFixed(2)     + ' GiB' : '—';

        $tip.innerHTML = `
            <div class="ptt-method">
                <span class="ptt-swatch" style="background:${method.color};"></span>
                ${method.name} ${oursTag}
            </div>
            <div class="ptt-row"><span>Model</span><b>${model.label}</b></div>
            ${ldsRow}
            <div class="ptt-row"><span>Runtime</span><b>${rtVal}</b></div>
            <div class="ptt-row"><span>Peak GPU</span><b>${gpuVal}</b></div>
        `;

        const rect = target.getBoundingClientRect();
        const wrapRect = $grid.getBoundingClientRect();
        const cx = rect.left + rect.width / 2 - wrapRect.left;
        const cy = rect.top - wrapRect.top;
        $tip.style.left = cx + 'px';
        $tip.style.top  = cy + 'px';
        $tip.classList.add('show');

        Object.entries(seriesGroups).forEach(([name, entries]) => {
            ['lds', 'runtime', 'gpu'].forEach(k => {
                const g = entries[k];
                if (!g || g.classList.contains('hidden')) return;
                if (name === methodName) g.classList.add('highlight');
                else g.classList.add('dimmed');
            });
        });
    }
    function hideTip() {
        $tip.classList.remove('show');
        Object.values(seriesGroups).forEach(entries => {
            ['lds', 'runtime', 'gpu'].forEach(k => {
                const g = entries[k];
                if (!g) return;
                g.classList.remove('highlight');
                g.classList.remove('dimmed');
            });
        });
    }

    [$svgLds, $svgRuntime, $svgGpu].forEach(($svg) => {
        $svg.addEventListener('mouseover', (e) => {
            const t = e.target;
            if (t.dataset && t.dataset.method) showTip(t);
        });
        $svg.addEventListener('mouseout', (e) => {
            const t = e.target;
            if (t.dataset && t.dataset.method) hideTip();
        });
        $svg.addEventListener('click', (e) => {
            const t = e.target;
            if (t.dataset && t.dataset.method) {
                showTip(t);
                setTimeout(hideTip, 2500);
            }
        });
    });

    // ── Legend ───────────────────────────────────────────────────────────
    METHODS.forEach((method) => {
        const li = document.createElement('li');
        li.className = method.ours ? 'ours' : '';
        li.dataset.method = method.name;
        li.innerHTML = `<span class="swatch" style="background:${method.color};"></span>${method.name}`;
        li.addEventListener('click', () => {
            const hide = !hiddenMethods.has(method.name);
            if (hide) hiddenMethods.add(method.name);
            else hiddenMethods.delete(method.name);
            const entries = seriesGroups[method.name];
            if (entries) {
                ['lds', 'runtime', 'gpu'].forEach(k => {
                    if (entries[k]) entries[k].classList.toggle('hidden', hide);
                });
            }
            li.classList.toggle('hidden', hide);
        });
        li.addEventListener('mouseenter', () => {
            Object.entries(seriesGroups).forEach(([name, entries]) => {
                ['lds', 'runtime', 'gpu'].forEach(k => {
                    const g = entries[k];
                    if (!g || g.classList.contains('hidden')) return;
                    if (name === method.name) g.classList.add('highlight');
                    else g.classList.add('dimmed');
                });
            });
        });
        li.addEventListener('mouseleave', () => {
            Object.values(seriesGroups).forEach(entries => {
                ['lds', 'runtime', 'gpu'].forEach(k => {
                    const g = entries[k];
                    if (!g) return;
                    g.classList.remove('highlight');
                    g.classList.remove('dimmed');
                });
            });
        });
        $legend.appendChild(li);
    });

    const liBoom = document.createElement('li');
    liBoom.className = 'info';
    liBoom.innerHTML = `<span class="boom">💥</span>Not Feasible`;
    $legend.appendChild(liBoom);
})();
