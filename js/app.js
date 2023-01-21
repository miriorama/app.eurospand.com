'use strict'

var UTIL = (function () {
    let util = {};

    util.capitalizeFirstLetter = function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    util.round = function(num) {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    }

    return util;
})();

var LANG = (function () {
    let lang = {
        data: null,
        _current: null,
        keys: ['es','bu','de','en','fr','gr','hu','it','nl','pt','ro','ru','tr']
    };

    lang.init = function(params) {
        let defaultParams = {
            lang: 'en',
        };
        params = Object.assign({}, defaultParams, params);

        let langPath = '/lang/' + params.lang + '.js';
        let script = document.createElement('script');
        script.onload = function () {
            lang.data = LANG_DATA;
            APP.init();
        };
        script.src = langPath;
        document.head.appendChild(script);

        //lang.data = API(langPath);
        lang._current = params.lang;
    }

    lang.current = function() {
        return lang._current;
    }

    lang.get = function(key) {
        return lang.data[key];
    }

    return lang;
})();

var API = (function () {
    let api = {};

    api = function(endpoint, parameters) {
        let body;
        let isJson = false;
        if (parameters instanceof FormData) {
            body = parameters;
        } else {
            isJson = true;
            let defaultParameters = {};
            parameters = Object.assign({}, defaultParameters, parameters);

            body = JSON.stringify(parameters);
        }

        function parseJSON(response) {
            return new Promise((resolve) => response.json()
              .then((json) => resolve({
                status: response.status,
                ok: response.ok,
                json,
              })));
        }

        let fetchOptions = {
            method: 'post',
            body: body,
        }

        if (isJson) {
            fetchOptions.headers = {
                'content-type': 'application/json'
            }
        }

        return new Promise((resolve, reject) => {
            fetch(endpoint, fetchOptions)
            .then((response) => {
                if(response.redirected) {
                    location.href = response.url;
                }
                return response;
            })
            .then(parseJSON)
            .then((response) => {
                if (response.ok) {
                    return resolve(response.json.content);
                }
                // extract the error from the server's json
                return reject(response.json);
                })
            .catch((error) => reject({
                networkError: error.message,
            }));
        });
    }

	return api;
})();

var APP = (function(){
    let app = {
        debug: true,
        currentMachine: null,
        currentConcime: null,
        concimeTypeList: ['fertilizzanti', 'semi', 'lumachicida']
    }

    let $main, $menu;

    app.init = function() {
        $main = document.querySelector('.main');
        $menu = document.querySelector('.menu');

        if(app.debug) {
            app.currentMachine = 'apollo-galileo';
            app.currentConcime = 'mesurol-pro';
            app.currentWorkingWidth = 9;
            app.currentWorkingSpeed = 6;
            app.currentWorkingQuantity = 1;
        }

        app.routes = [
            {   regex: '^$',
                template: 'index',
                callback: app.initIndex
            },
            {   regex: '^set-machine/?$',
                template: 'set-machine',
                callback: app.initSetMachine
            },
            {   regex: '^set-concime/?$',
                template: 'set-concime',
                callback: app.initSetConcime
            },
            {   regex: '^set-params/?$',
                template: 'set-params',
                callback: app.initSetWorkingParameters
            },
            {   regex: '^result/?$',
                template: 'result',
                callback: app.initResult
            }
        ];

        // gestione hash
        window.addEventListener('hashchange', APP.onHashChange, false);
        APP.onHashChange();

        app.initMenu();
    }
    app.onHashChange = function() {
        app.hash = location.hash.substring(1);
        let animate = true;

        for (const route of app.routes) {
            let regex = new RegExp(route.regex, 'i');
            let match = app.hash.match(regex);

            if(match) {
                let params = match.groups;
                let $template = document.querySelector(`template[data-section=${route.template}]`);
                if ($template) {
                    if(app.currentTemplate) {
                    app.previousTemplate = app.currentTemplate;
                    }
                    app.currentTemplate = route.template;
                    let $html = $template.content.cloneNode(true);

                    if(animate) {
                        document.body.classList.remove('animate');

                        if(app.previousTemplate) {
                        setTimeout(function() {
                            hide();
                        }, 300);
                        } else {
                        hide();
                        }
                    }

                    function hide() {
                        let $toAppend = null;
                        if (typeof route.callback === 'function') {
                            $toAppend = route.callback($html, params);
                        } else {
                            $toAppend = $html;
                        }

                        if($toAppend) {
                        $main.innerHTML = '';
                        $main.append($toAppend);
                        } else {

                        }
                        if(animate) {
                        window.setTimeout(function() {
                            show();
                        }, 300);
                        } else {
                            show();
                        }

                        function show() {
                        document.body.classList.add('animate');
                        }
                    }


                }

                break;
            }
        }
    }
    app.changeContent = function(content) {
        location.hash = content;
    }
    app.initIndex = function($html) {
        console.log('test');

        $main.innerHTML = '';
        $main.append($html);



        return null;
    }

    app.initMenu = function() {
        let $menuSaved = $menu.querySelector('.menu-saved');
        let $menuLang = $menu.querySelector('.menu-lang');
        let $menuUnit = $menu.querySelector('.menu-unit');
        let $menuWho = $menu.querySelector('.menu-who');
        let $menuContact = $menu.querySelector('.menu-contact');

        $menuSaved.innerHTML = LANG.get('menu-saved');
        $menuLang.innerHTML = LANG.get('menu-lang');
        $menuUnit.innerHTML = LANG.get('menu-unit');
        $menuWho.innerHTML = LANG.get('menu-who');
        $menuContact.innerHTML = LANG.get('menu-contact');
    }
    app.menuOpen = function() {
        $menu.classList.add('is-visible');
    }
    app.menuClose = function() {
        $menu.classList.remove('is-visible');
    }

    // MACHINE
    app.initSetMachine = function($html) {
        let $machineList = $html.querySelector('.machine-list');
        let machineList = app.getMachine();

        let html = '';
        for (const machineId of Object.keys(machineList)) {
            let machine = machineList[machineId];

            html += `<div class="machine">
                <div class="machine-img">
                    <img src="/img/machine/${machineId}.jpg" alt="${machine.name}" />
                    <button onclick="APP.setMachine('${machineId}');">${LANG.get('select')}</button>
                </div>
                ${machine.name}
            </div>`;
        }
        $machineList.innerHTML = html;

        $main.innerHTML = app.getStepHtml('machine');
        $main.append($html);

        return null;
    }
    app.getMachine = function(machineId) {
        if(machineId) {
            return MACHINE_DATA[machineId];
        } else {
            return MACHINE_DATA;
        }
    }
    app.setMachine = function(machineId) {
        if(!machineId) {
            return;
        }

        app.currentMachine = machineId;

        app.changeContent('set-concime');
    }
    app.getStepHtml = function(step) {
        let html = '';
        let cssClass = 'selected';

        html = `<div class="step-list">
            <div class="step ${('machine' === step ? cssClass : '')}" onclick="APP.changeContent('set-machine');">${LANG.get('step-machine')}</div>
            <div class="step ${('concime' === step ? cssClass : '')}" onclick="APP.changeContent('set-concime');">${LANG.get('step-concime')}</div>
            <div class="step ${('params' === step ? cssClass : '')}" onclick="APP.changeContent('set-params');">${LANG.get('step-params')}</div>
        </div>`;

        return html;
    }
    app.showMachine = function(machineId) {
        let machine = app.getMachine(machineId);

        let $machineImg = 'machine-img';
        let $machineTitle = 'machine-title';
        let $machineSubtitle = 'machine-subtitle';
        let $machineDesc = 'machine-desc';

        let html = `<div class="machine">
            <div class="machine-img">${machineImg}</div>
            <div class="machine-title">${machineTitle}</div>
            <div class="machine-subtitle">${machineSubtitle}</div>
            <div class="machine-desc">${machineDesc}</div>
        </div>`;

        let $html = document.createElement('div');
        $html.innerHTML = html;

        document.body.appendChild($html);
        document.body.classList.add('alert-overflow');
    }

    // CONCIME
    app.initSetConcime = function($html) {
        let $concimeTypeList = $html.querySelector('.concime-type-list');
        let $concimeList = $html.querySelector('.concime-list');
        let concimeList = app.getConcime();

        // Tipi di concime
        let html = '';
        for (const concimeType of app.concimeTypeList) {
            let concimeTypeName = UTIL.capitalizeFirstLetter(concimeType);
            html += `<div class="concime-type">
                <div class="concime-type-img">
                    <img src="/img/concime-type/${concimeType}.png" alt="${concimeTypeName}" />
                    <button onclick="APP.setConcimeType('${concimeType}');">${LANG.get('select')}</button>
                </div>
                ${concimeTypeName}
            </div>`;
        }
        $concimeTypeList.innerHTML = html;

        html = '';
        for (const concimeId of Object.keys(concimeList)) {
            let concime = concimeList[concimeId];

            html += `<div class="concime" data-concime-type="${concime.type}" hidden>
                <div class="concime-img">
                    <img src="/img/concime/${concimeId}.png" alt="${concime.name}" />
                    <button onclick="APP.setConcime('${concimeId}');">${LANG.get('select')}</button>
                </div>
                ${concime.name}
            </div>`;
        }
        $concimeList.innerHTML = html;

        $main.innerHTML = app.getStepHtml('concime');
        $main.append($html);

        return null;
    }
    app.getConcime = function(concimeId) {
        if(concimeId) {
            return CONCIME_DATA[concimeId];
        } else {
            return CONCIME_DATA;
        }
    }
    app.setConcimeType = function(concimeTypeId) {
        if(!concimeTypeId) {
            return;
        }

        let $concimeList = document.querySelectorAll('.concime');
        for (const $concime of $concimeList) {
            if($concime.getAttribute('data-concime-type') === concimeTypeId) {
                $concime.removeAttribute('hidden');
            } else {
                $concime.setAttribute('hidden', '');
            }
        }
    }
    app.setConcime = function(concimeId) {
        if(!concimeId) {
            return;
        }

        app.currentConcime = concimeId;

        app.changeContent('set-params');
    }

    // PARAMS
    app.initSetWorkingParameters = function($html) {
        let currentMachine = app.getMachine(app.currentMachine);

        let $optionalWidth = $html.querySelector('.optional-width');
        if(currentMachine.widthOpt) {
            $optionalWidth.removeAttribute('hidden');

            //let $optionalCheck = $html.querySelector('.optional-width-check');
            let $optionalLabel = $html.querySelector('.optional-width-label');
            $optionalLabel.innerHTML = LANG.get('working-optional-kit');
        } else {
            $optionalWidth.setAttribute('hidden', '');
        }

        let params = {
            'width': {
                min: currentMachine.widthMin,
                max: app.getMaxWidth(app.currentMachine, app.currentConcime)
            },
            'speed': {
                min: 6,
                max: 20
            },
            'quantity': {
                min: 3,
                max: 1000
            }
        };

        for (const paramId of Object.keys(params)) {
            let param = params[paramId];
            let $parameterTitle = $html.querySelector('.parameter-' + paramId + ' .parameter-title');
            let $parameterSlider = $html.querySelector('.parameter-' + paramId + ' .parameter-slider input');
            let $parameterMax = $html.querySelector('.parameter-' + paramId + ' .parameter-max');
            let $parameterMin = $html.querySelector('.parameter-' + paramId + ' .parameter-min');

            $parameterTitle.innerHTML = UTIL.capitalizeFirstLetter(paramId);
            $parameterMin.innerHTML = param.min + 'm';
            $parameterSlider.setAttribute('min', param.min);
            $parameterMax.innerHTML = param.max + 'm';
            $parameterSlider.setAttribute('max', param.max);
        }

        $main.innerHTML = app.getStepHtml('params');
        $main.append($html);

        return null;
    }
    app.refreshCheckLabel = function($el) {
        let $textInput = $el.closest('.parameter').querySelector('.parameter-text input');
        console.log($el.value);
        $textInput.value = $el.value;
    }
    app.refreshMaxWorkingWidth = function() {
        let currentMachine = app.getMachine(app.currentMachine);
        let $optionalWidthCheckbox = document.querySelector('.optional-width-checkbox');
        let $parameterMax = document.querySelector('.parameter-width .parameter-max');
        let $parameterSlider = document.querySelector('.parameter-width .parameter-slider input');

        let maxWidth = app.getMaxWidth(app.currentMachine, app.currentConcime, $optionalWidthCheckbox.checked);

        $parameterMax.innerHTML = maxWidth + 'm';
        $parameterSlider.setAttribute('max', maxWidth);

        app.refreshCheckLabel($parameterSlider);
    }
    app.paramsReset = function() {

    }
    app.paramsCompute = function() {
        app.currentWorkingWidth = document.querySelector('.parameter-width .parameter-slider input').value;
        app.currentWorkingSpeed = document.querySelector('.parameter-speed .parameter-slider input').value;
        app.currentWorkingQuantity = document.querySelector('.parameter-quantity .parameter-slider input').value;

        app.changeContent('result');
    }
    app.getMaxWidth = function(machineId, concimeId, isOptKit = false) {
        let currentMachine = app.getMachine(machineId);
        let currentConcime = app.getConcime(concimeId);

        let maxWidth = Math.min(currentMachine.widthMax, currentConcime.spreadingLimit);
        let exceptionList = (isOptKit ? currentMachine.widthOptException : currentMachine.widthException);
        if(exceptionList && concimeId in exceptionList) {
            maxWidth = Math.min(maxWidth, exceptionList[concimeId]);
        }

        return maxWidth;
    }
    app.getOpening = function(machineId, concimeId) {
        const OPENING = 0;
        const KGMIN = 1;
        let currentMachine = app.getMachine(machineId);
        let currentConcime = app.getConcime(concimeId);

        let kgMin = app.currentWorkingQuantity * app.currentWorkingWidth * app.currentWorkingSpeed / 600;
        kgMin = UTIL.round(kgMin);

        let opening = null;
        let curveList = CURVE_DATA[concimeId];
        let minDiff = Number.MAX_VALUE;
        let diff = null;
        for (let i = 0; i < curveList.length; i++) {
            diff = Math.abs(curveList[i][KGMIN] - kgMin);
            if(diff < minDiff) {
                minDiff = diff;
                opening = curveList[i][OPENING];
            } else {
                break;
            }
        }

        return {
            opening: opening,
            kgMin: kgMin,
        }
    }

    // RESULT
    app.initResult = function($html) {
        let currentMachine = app.getMachine(app.currentMachine);
        let currentConcime = app.getConcime(app.currentConcime);
        let $resultList = $html.querySelector('.result-list');

        function getResultHtml(text, value) {
            let template = `<div class="result">
                <div class="result-text">${text}</div>
                <div class="result-value">${value}</div>
            </div>`;

            return template;
        }

        let html = '';

        let opening = app.getOpening(app.currentMachine, app.currentConcime);

        html += getResultHtml('openening', opening.opening);
        html += getResultHtml('kg/min', opening.kgMin);

        html += getResultHtml('spreader', currentMachine.name);
        html += getResultHtml('discs height', '');
        html += getResultHtml('pto speed', '');

        html += getResultHtml('family', currentConcime.type);
        html += getResultHtml('product', currentConcime.name);
        html += getResultHtml('form', currentConcime.shape);
        html += getResultHtml('weight', currentConcime.weight);

        html += getResultHtml('working width', app.currentWorkingWidth);
        html += getResultHtml('speed', app.currentWorkingSpeed);
        html += getResultHtml('quantity', app.currentWorkingQuantity);
        $resultList.innerHTML = html;

        $main.innerHTML = '';
        $main.append($html);

        return null;
    }
    app.saveResult = function() {

    }
    app.getResultList = function() {

    }

    return app;
})();

document.addEventListener("DOMContentLoaded", function() {
    LANG.init();
});