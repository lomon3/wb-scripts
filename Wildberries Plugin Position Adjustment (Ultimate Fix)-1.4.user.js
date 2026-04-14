// ==UserScript==
// @name         Wildberries Plugin Position Adjustment (Ultimate Fix)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Боковые панели. Полное решение проблемы с зависанием виджетов при переключении товаров.
// @author       CyberSeller
// @match        *://*.wildberries.ru/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wildberries.ru
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

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
    `;
    document.head.appendChild(style);

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

        // Ищем свежий плагин Маяка, который находится ВНЕ нашей левой панели
        const freshLeftPlugin = Array.from(document.querySelectorAll('.mwb-info-block'))
            .find(el => !leftPanelInfo.content.contains(el));

        if (freshLeftPlugin) {
            leftPanelInfo.content.innerHTML = ''; // Стираем старье
            leftPanelInfo.content.appendChild(freshLeftPlugin); // Забираем свежий
        }

        // Ищем свежий плагин MPStats, который находится ВНЕ нашей правой панели
        // Ищем сразу по классу и по ID для максимальной надежности
        const freshRightPlugin = Array.from(document.querySelectorAll('.mpstats-sidebar-widget-new, #mpstats-sidebar-widget'))
            .find(el => !rightPanelInfo.content.contains(el));

        if (freshRightPlugin) {
            rightPanelInfo.content.innerHTML = ''; // Стираем зависший плагин
            rightPanelInfo.content.appendChild(freshRightPlugin); // Забираем актуальный
        }
    };

    // Запускаем при загрузке
    window.addEventListener('load', adjustPosition);

    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
        const url = location.href;

        // Главная магия: если изменился артикул (URL), принудительно убиваем старые плагины
        if (url !== lastUrl) {
            lastUrl = url;
            leftPanelInfo.content.innerHTML = '';
            rightPanelInfo.content.innerHTML = '';
            checkVisibility();
        }

        adjustPosition();
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();