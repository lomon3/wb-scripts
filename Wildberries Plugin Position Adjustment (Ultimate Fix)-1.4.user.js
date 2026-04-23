// ==UserScript==
// @name         Wildberries Plugin Position Adjustment (Ultimate Fix v1.5)
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Боковые панели. Полное решение проблемы с зависанием виджетов + Восстановление тултипов диаграммы Маяка.
// @author       CyberSeller
// @match        *://*.wildberries.ru/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wildberries.ru
// @grant        none
// @updateURL    https://github.com/lomon3/wb-scripts/raw/refs/heads/main/Wildberries%20Plugin%20Position%20Adjustment%20(Ultimate%20Fix)-1.4.user.js
// @downloadURL  https://github.com/lomon3/wb-scripts/raw/refs/heads/main/Wildberries%20Plugin%20Position%20Adjustment%20(Ultimate%20Fix)-1.4.user.js
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. СТИЛИ ---
    const style = document.createElement('style');
    style.innerHTML = `
        .custom-wb-panel {
            position: fixed;
            top: 0px;
            z-index: 99999;
            display: flex;
            height: 100vh;
            pointer-events: none;
            transition: transform 0.3s ease-in-out;
        }
        .custom-wb-panel-content {
            pointer-events: auto;
            background: transparent;
            height: 100vh;
            overflow-y: auto;
            overflow-x: hidden;
            display: flex;
            flex-direction: column;
            padding-bottom: 50px;
        }
        .custom-wb-panel-content::-webkit-scrollbar { width: 6px; }
        .custom-wb-panel-content::-webkit-scrollbar-track { background: transparent; }
        .custom-wb-panel-content::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 4px; }
        .custom-wb-panel-content::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.4); }

        .custom-wb-toggle {
            pointer-events: auto;
            cursor: pointer;
            background: rgba(203, 17, 171, 0.9);
            color: white;
            border: none;
            width: 24px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            margin-top: 20vh;
            backdrop-filter: blur(4px);
            transition: background 0.2s;
        }
        .custom-wb-toggle:hover {
            background: rgba(203, 17, 171, 1);
        }

        #custom-panel-left { left: 0; transform: translateX(0); }
        #custom-panel-left .custom-wb-toggle { border-radius: 0 8px 8px 0; }
        #custom-panel-left.collapsed { transform: translateX(calc(-100% + 24px)); }

        #custom-panel-right { right: 0; flex-direction: row-reverse; transform: translateX(0); }
        #custom-panel-right .custom-wb-toggle { border-radius: 8px 0 0 8px; }
        #custom-panel-right.collapsed { transform: translateX(calc(100% - 24px)); }

        .mwb-info-block, #mpstats-sidebar-widget, .mpstats-sidebar-widget-new {
            position: relative !important;
            top: 0 !important;
            max-height: none !important;
            height: auto !important;
            background: #ffffff !important;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            margin: 10px;
            padding: 10px;
        }

        /* Улучшаем внешний вид столбиков при наведении */
        .mwb-chart-col { transition: opacity 0.2s; cursor: crosshair; }
        .mwb-chart-col:hover { opacity: 0.7; }
    `;
    document.head.appendChild(style);

    // --- 2. ЛОГИКА ПАНЕЛЕЙ ---
    function createPanel(side, id) {
        const panel = document.createElement('div');
        panel.id = id;
        panel.className = 'custom-wb-panel';

        const content = document.createElement('div');
        content.className = 'custom-wb-panel-content';

        const toggle = document.createElement('button');
        toggle.className = 'custom-wb-toggle';
        toggle.innerText = side === 'left' ? '❮' : '❯';

        toggle.onclick = () => {
            const isCollapsed = panel.classList.toggle('collapsed');
            if (side === 'left') {
                toggle.innerText = isCollapsed ? '❯' : '❮';
            } else {
                toggle.innerText = isCollapsed ? '❮' : '❯';
            }
        };

        panel.appendChild(content);
        panel.appendChild(toggle);
        document.body.appendChild(panel);

        return { panel, content };
    }

    const leftPanelInfo = createPanel('left', 'custom-panel-left');
    const rightPanelInfo = createPanel('right', 'custom-panel-right');

    const checkVisibility = () => {
        const isProductPage = /\/catalog\/\d+/.test(window.location.href);
        leftPanelInfo.panel.style.display = isProductPage ? 'flex' : 'none';
        rightPanelInfo.panel.style.display = isProductPage ? 'flex' : 'none';
        return isProductPage;
    };

    const adjustPosition = () => {
        if (!checkVisibility()) return;

        const freshLeftPlugin = Array.from(document.querySelectorAll('.mwb-info-block'))
            .find(el => !leftPanelInfo.content.contains(el));

        if (freshLeftPlugin) {
            leftPanelInfo.content.innerHTML = '';
            leftPanelInfo.content.appendChild(freshLeftPlugin);
        }

        const freshRightPlugin = Array.from(document.querySelectorAll('.mpstats-sidebar-widget-new, #mpstats-sidebar-widget'))
            .find(el => !rightPanelInfo.content.contains(el));

        if (freshRightPlugin) {
            rightPanelInfo.content.innerHTML = '';
            rightPanelInfo.content.appendChild(freshRightPlugin);
        }
    };

    window.addEventListener('load', adjustPosition);

    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
        const url = location.href;

        if (url !== lastUrl) {
            lastUrl = url;
            leftPanelInfo.content.innerHTML = '';
            rightPanelInfo.content.innerHTML = '';
            checkVisibility();
        }

        adjustPosition();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // --- 3. СОБСТВЕННЫЙ ТУЛТИП ДЛЯ ДИАГРАММЫ МАЯКА ---
    // Создаем невидимый блок тултипа, который будет летать за мышкой
    const customTooltip = document.createElement('div');
    customTooltip.style.cssText = `
        position: fixed;
        background: rgba(30, 30, 30, 0.95);
        color: #ffffff;
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 13px;
        line-height: 1.6;
        pointer-events: none; /* Чтобы мышка прокликивала тултип насквозь */
        z-index: 9999999; /* Поверх вообще всего на WB */
        display: none;
        box-shadow: 0 8px 16px rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        white-space: nowrap;
        backdrop-filter: blur(4px);
        font-family: sans-serif;
    `;
    document.body.appendChild(customTooltip);

    // Ловим наведение на столбик
    document.addEventListener('mouseover', (e) => {
        const col = e.target.closest('.mwb-chart-col');
        if (col) {
            const date = col.getAttribute('data-d') || '-';
            const orders = col.getAttribute('data-o') || '0';
            const remains = col.getAttribute('data-r') || '0';

            // Наполняем тултип данными
            customTooltip.innerHTML = `
                <div style="font-weight: bold; color: #ff9800; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px; margin-bottom: 4px;">📅 ${date}</div>
                <div>🛒 Продажи: <b>${orders}</b> шт.</div>
                <div>📦 Остатки: <b>${remains}</b> шт.</div>
            `;
            customTooltip.style.display = 'block';
        }
    });

    // Двигаем тултип за мышкой
    document.addEventListener('mousemove', (e) => {
        if (customTooltip.style.display === 'block') {
            customTooltip.style.left = (e.clientX + 15) + 'px';
            customTooltip.style.top = (e.clientY + 15) + 'px';
        }
    });

    // Скрываем, когда убираем мышку
    document.addEventListener('mouseout', (e) => {
        const col = e.target.closest('.mwb-chart-col');
        if (col) {
            customTooltip.style.display = 'none';
        }
    });

})();
