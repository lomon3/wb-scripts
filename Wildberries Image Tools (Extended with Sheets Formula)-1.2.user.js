// ==UserScript==
// @name         Wildberries Image Tools (Extended + Native Download)
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Кнопки: копировать, открыть, открыть все, формула, СКАЧАТЬ (через GM_download)
// @author       You
// @match        *://*.wildberries.ru/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wildberries.ru
// @grant        GM_download
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. Открыть все фото ---
    function openAllPhotos() {
        const m = window.location.href.match(/catalog\/(\d+)/);
        let id = m ? m[1] : null;
        if (!id) {
            const e = document.getElementById('productNmId');
            id = e ? e.textContent.trim() : null;
        }

        let imgs = Array.from(document.querySelectorAll('img'))
            .map(i => i.src)
            .filter(s => s.includes('/images/big/') && s.includes('.webp') && (s.includes('wbcontent.net') || s.includes('wbbasket.ru')));

        if (id) {
            imgs = imgs.filter(s => s.includes('/' + id + '/'));
        }

        const uniqueImages = [...new Set(imgs)];
        if (uniqueImages.length) {
            uniqueImages.forEach(src => window.open(src, '_blank'));
        } else {
            alert('Изображения не найдены.');
        }
    }

    // --- 2. Копирование WebP как PNG ---
    async function copyImageToClipboard(src, btn) {
        try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                canvas.toBlob(async function(blob) {
                    try {
                        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                        showFeedback(btn, '✅');
                    } catch (err) {
                        fallbackCopy(src, btn);
                    }
                }, 'image/png');
            };
            img.onerror = () => fallbackCopy(src, btn);
            img.src = src;
        } catch (err) {
            fallbackCopy(src, btn);
        }
    }

    function fallbackCopy(src, btn) {
        navigator.clipboard.writeText(src);
        showFeedback(btn, '🔗');
    }

    function showFeedback(btn, emoji) {
        const oldText = btn.innerText;
        btn.innerText = emoji;
        setTimeout(() => { btn.innerText = oldText; }, 1500);
    }

    // --- 3. Генерация формулы Google Sheets ---
    async function generateAndCopySheetsFormula(btn) {
        showFeedback(btn, '⏳');
        try {
            const response = await fetch('https://cdn.wbbasket.ru/api/v3/upstreams');
            if (!response.ok) throw new Error('CDN API failure');
            const json = await response.json();

            function findBasketMap(obj) {
                if (!obj || typeof obj !== 'object') return null;
                if (obj.mediabasket_route_map) return obj.mediabasket_route_map;
                for (let key in obj) {
                    const result = findBasketMap(obj[key]);
                    if (result) return result;
                }
                return null;
            }

            const routeMapArray = findBasketMap(json);
            if (!routeMapArray) throw new Error('Mediabasket array not found');

            const routeMap = routeMapArray.find(m => m.method === 'range');
            if (!routeMap || !routeMap.hosts) throw new Error('Mediabasket route map not found');

            const hosts = routeMap.hosts;
            let switchConditions = [];

            for (let i = 0; i < hosts.length; i++) {
                const h = hosts[i];
                const hostUrl = h.host;
                if (i === 0) {
                    switchConditions.push(`И(b >= 0; b <= ${h.vol_range_to}); "${hostUrl}"`);
                } else if (i === hosts.length - 1) {
                    switchConditions.push(`"${hostUrl}"`);
                } else {
                    switchConditions.push(`b <= ${h.vol_range_to}; "${hostUrl}"`);
                }
            }

            const formula = `=LET(  a; $C3;  b; ЦЕЛОЕ(a / 100000);  targetHost; SWITCH( ИСТИНА; ${switchConditions.join("; ")} );  ГИПЕРССЫЛКА(    "https://www.wildberries.ru/catalog/" & a & "/detail.aspx?targetUrl=GP";    IMAGE(      "https://" & targetHost & "/vol" & b & "/part" & ЦЕЛОЕ(a / 1000) & "/" & a & "/images/big/1.webp"; 1    )  ))`;

            await navigator.clipboard.writeText(formula);
            showFeedback(btn, '📊✅');

        } catch (error) {
            console.error('Formula generation error:', error);
            showFeedback(btn, '❌');
        }
    }

    // --- 4. НОВЫЙ ФУНКЦИОНАЛ: Скачивание через Tampermonkey ---
    function downloadImage(src, btn) {
        showFeedback(btn, '⏳');

        // Ищем артикул и номер фото
        const match = src.match(/\/(\d+)\/images\/big\/(\d+)\.webp/);
        let filename = 'image.webp';

        if (match) {
            const articleId = match[1];
            const imgNum = match[2];
            filename = `${articleId}_${imgNum}.webp`; // Например: 799605507_3.webp
        } else {
            const urlMatch = window.location.href.match(/catalog\/(\d+)/);
            if (urlMatch) filename = `${urlMatch[1]}.webp`;
        }

        // Используем встроенный менеджер загрузок Tampermonkey
        GM_download({
            url: src,
            name: filename,
            saveAs: false, // false = качать сразу в папку Загрузки, true = спросить куда сохранить
            onload: function() {
                showFeedback(btn, '💾✅');
            },
            onerror: function(error) {
                console.error('GM_download error:', error);
                showFeedback(btn, '❌');
                // Запасной план, если что-то пошло не так
                window.open(src, '_blank');
            }
        });
    }

    // --- 5. Внедрение UI ---
    function injectButtons() {
        const containers = document.querySelectorAll('.imageContainer--TnaxW:not(.has-wb-tools), .zoomImage--Nlxie:not(.has-wb-tools)');

        containers.forEach(container => {
            const img = container.querySelector('img');
            if (!img || !img.src.includes('.webp')) return;

            container.classList.add('has-wb-tools');
            container.style.position = 'relative';

            const btnGroup = document.createElement('div');
            btnGroup.style.cssText = 'position: absolute; top: 12px; right: 12px; z-index: 100000; display: flex; gap: 6px;';

            const createBtn = (icon, title, onClick) => {
                const btn = document.createElement('button');
                btn.innerText = icon;
                btn.title = title;
                btn.style.cssText = `
                    background: rgba(255, 255, 255, 0.9);
                    border: 1px solid rgba(0,0,0,0.1);
                    border-radius: 6px;
                    width: 32px;
                    height: 32px;
                    cursor: pointer;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    backdrop-filter: blur(4px);
                    transition: all 0.2s ease;
                    padding: 0;
                    margin: 0;
                    color: black;
                `;
                btn.onmouseenter = () => btn.style.background = '#ffffff';
                btn.onmouseleave = () => btn.style.background = 'rgba(255, 255, 255, 0.9)';
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClick(btn);
                };
                return btn;
            };

            const btnCopy = createBtn('📋', 'Скопировать фото (в буфер)', (btn) => copyImageToClipboard(img.src, btn));
            const btnCurrent = createBtn('🖼️', 'Открыть это фото', () => window.open(img.src, '_blank'));
            const btnAll = createBtn('📚', 'Открыть все фото', () => openAllPhotos());
            const btnFormula = createBtn('📊', 'Генерировать формулу Google Sheets', (btn) => generateAndCopySheetsFormula(btn));
            const btnDownload = createBtn('💾', 'Скачать файл с именем артикула', (btn) => downloadImage(img.src, btn));

            btnGroup.appendChild(btnCopy);
            btnGroup.appendChild(btnCurrent);
            btnGroup.appendChild(btnAll);
            btnGroup.appendChild(btnFormula);
            btnGroup.appendChild(btnDownload);

            container.appendChild(btnGroup);
        });
    }

    setInterval(injectButtons, 1000);

})();
