// ==UserScript==
// @name         Wildberries NMID Catcher v2.4 (Collapsible)
// @namespace    WBTools
// @version      2.4
// @description  Парсинг nmId в выезжающей панели (скрыта по умолчанию)
// @author       CyberSeller
// @match        https://www.wildberries.ru/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wildberries.ru
// @grant        none
// @updateURL    https://github.com/lomon3/wb-scripts/raw/refs/heads/main/Wildberries%20NMID%20Catcher%20v2.4%20(Collapsible)-2.4.user.js
// @downloadURL  https://github.com/lomon3/wb-scripts/raw/refs/heads/main/Wildberries%20NMID%20Catcher%20v2.4%20(Collapsible)-2.4.user.js
// ==/UserScript==

console.log('🔥 CyberSeller NM Catcher v2.4: Init');

(function () {
    'use strict';

    // --- State ---
    const state = {
        ids: new Set(),
        apiUrl: null,
        apiParams: null,
        ui: null,
        statusEl: null,
        indicatorEl: null
    };

    // --- Core Logic ---
    const extractIds = (json) => {
        let ids = [];
        try {
            if (Array.isArray(json?.data?.products)) ids = json.data.products.map(p => p.id);
            else if (Array.isArray(json?.data?.list)) ids = json.data.list.map(p => p.id);
            else if (Array.isArray(json?.products)) ids = json.products.map(p => p.id);
        } catch (e) {
            console.warn('[WB-NMID] Ошибка разбора JSON:', e);
        }
        return ids.filter(Boolean);
    };

    const parseUrlParams = (url) => {
        const [base, query] = url.split('?');
        if (!query) return { base, params: {} };
        const params = {};
        new URLSearchParams(query).forEach((v, k) => params[k] = v);
        return { base, params };
    };

    const buildUrl = (base, params) => {
        return base + '?' + Object.entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
    };

    const saveTxt = () => {
        if (!state.ids.size) return alert("❌ Список пуст. Сначала собери данные.");
        const blob = new Blob([[...state.ids].join('\n')], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `wb_ids_${state.ids.size}_sku.txt`;
        a.click();
    };

    // --- UI Construction ---
    const updateStatus = (msg, color = '#aaa') => {
        if (state.statusEl) {
            state.statusEl.innerText = msg;
            state.statusEl.style.color = color;
        }
    };

    const setReadyState = (isReady) => {
        if (state.indicatorEl) {
            state.indicatorEl.style.background = isReady ? '#4caf50' : '#f44336';
            state.indicatorEl.style.boxShadow = isReady ? '0 0 8px #4caf50' : 'none';
        }
        if (isReady) updateStatus(`Готов к работе. Собрано: ${state.ids.size}`, '#fff');
        else updateStatus('Скрольте ленту или смените сортировку!', '#f44336');
    };

    const createUI = () => {
        if (document.getElementById('cbs-wrapper')) return document.getElementById('cbs-wrapper');

        // Добавляем стили для выезжающей панели
        const style = document.createElement('style');
        style.innerHTML = `
            #cbs-wrapper {
                position: fixed;
                top: 60%; /* Расположение по вертикали */
                right: 0;
                z-index: 999999;
                display: flex;
                align-items: center;
                transition: transform 0.3s ease;
                transform: translateX(0); /* Открыто */
            }
            #cbs-wrapper.collapsed {
                transform: translateX(calc(100% - 24px)); /* Скрыто, виден только язычок */
            }
            .cbs-toggle-btn {
                width: 24px;
                height: 60px;
                background: rgba(20, 20, 20, 0.95);
                color: #ff9800;
                border: 1px solid #444;
                border-right: none;
                border-radius: 8px 0 0 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
            }
        `;
        document.head.appendChild(style);

        const wrapper = document.createElement('div');
        wrapper.id = 'cbs-wrapper';
        wrapper.className = 'collapsed'; // СКРЫТ ПО УМОЛЧАНИЮ

        // Кнопка переключения
        const toggleBtn = document.createElement('div');
        toggleBtn.className = 'cbs-toggle-btn';
        toggleBtn.innerText = '❮';
        toggleBtn.onclick = () => {
            const isCollapsed = wrapper.classList.toggle('collapsed');
            toggleBtn.innerText = isCollapsed ? '❮' : '❯';
        };

        // Основное окно
        const container = document.createElement('div');
        container.style.cssText = `
            background: rgba(20, 20, 20, 0.95); padding: 12px; border-radius: 0 0 0 12px;
            color: #fff; font-family: sans-serif; font-size: 12px; width: 150px;
            border: 1px solid #444; backdrop-filter: blur(4px); display: flex; flex-direction: column; gap: 8px;
        `;

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;';
        const title = document.createElement('span');
        title.innerText = 'CyberParser';
        title.style.fontWeight = 'bold';
        state.indicatorEl = document.createElement('div');
        state.indicatorEl.style.cssText = 'width: 10px; height: 10px; border-radius: 50%; background: #f44336; transition: 0.3s;';
        header.appendChild(title);
        header.appendChild(state.indicatorEl);
        container.appendChild(header);

        state.statusEl = document.createElement('div');
        state.statusEl.innerText = 'Жду запрос...';
        state.statusEl.style.cssText = 'font-size: 10px; color: #888; margin-bottom: 5px; line-height: 1.2;';
        container.appendChild(state.statusEl);

        const input = document.createElement('input');
        input.type = 'number';
        input.value = 1;
        input.min = 1;
        input.max = 50;
        input.placeholder = 'Стр';
        input.style.cssText = 'padding: 5px; background: #333; border: 1px solid #555; color: white; border-radius: 4px; width: 100%; box-sizing: border-box;';
        container.appendChild(input);

        const btnFetch = document.createElement('button');
        btnFetch.innerText = '🚀 Парсить страницы';
        btnFetch.style.cssText = 'background: #ff9800; color: black; border: none; padding: 6px; border-radius: 4px; cursor: pointer; font-weight: bold;';
        btnFetch.onclick = async () => {
            if (!state.apiUrl) return alert('⛔ Ссылка API еще не захвачена!\n\n👉 Пролистайте страницу вниз или смените сортировку, чтобы скрипт увидел запрос.');
            const pages = parseInt(input.value) || 1;
            updateStatus('Работаю...', 'orange');
            for (let i = 1; i <= pages; i++) {
                const newParams = { ...state.apiParams, page: i };
                const url = buildUrl(state.apiUrl, newParams);
                try {
                    await new Promise(r => setTimeout(r, 400));
                    const res = await fetch(url, { credentials: 'include' });
                    if (!res.ok) throw new Error(res.status);
                    const json = await res.json();
                    const extracted = extractIds(json);
                    extracted.forEach(id => state.ids.add(id));
                    updateStatus(`Стр ${i}: +${extracted.length} шт.`);
                } catch (e) {
                    console.error(e);
                    updateStatus(`Ошибка стр ${i}`, 'red');
                }
            }
            updateStatus(`Готово! Всего: ${state.ids.size}`, '#4caf50');
        };
        container.appendChild(btnFetch);

        const btnSave = document.createElement('button');
        btnSave.innerText = '💾 Скачать';
        btnSave.style.cssText = 'background: #4caf50; color: white; border: none; padding: 6px; border-radius: 4px; cursor: pointer; margin-top: 4px;';
        btnSave.onclick = saveTxt;
        container.appendChild(btnSave);

        wrapper.appendChild(toggleBtn);
        wrapper.appendChild(container);
        return wrapper;
    };

    const attachUI = () => {
        if (!state.ui?.isConnected) {
            state.ui = createUI();
            document.body.appendChild(state.ui);
        }
    };

    // --- Interceptor ---
    const origFetch = window.fetch;
    window.fetch = async function (...args) {
        const res = await origFetch.apply(this, args);
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;

        if (url && (url.includes('/catalog') || url.includes('/search') || url.includes('/filter'))) {
            try {
                const clone = res.clone();
                const json = await clone.json();
                const ids = extractIds(json);

                if (ids.length > 0) {
                    const { base, params } = parseUrlParams(url);
                    state.apiUrl = base;
                    state.apiParams = params;
                    ids.forEach(id => state.ids.add(id));
                    console.log(`[WB-NMID] 🟢 Captured ${ids.length} items from ${base}`);
                    attachUI();
                    setReadyState(true);
                }
            } catch (e) {}
        }
        return res;
    };

    setInterval(attachUI, 2000);

})();
