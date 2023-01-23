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
            app.currentMachine = 'david-compact';
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

                        $main.setAttribute('data-section', route.template);

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

            html += `<button class="machine" onclick="APP.setMachine('${machineId}');">
                <div class="machine-img">
                    <img src="/img/machine/${machineId}.jpg" alt="${machine.name}" />
                </div>
                <div class="machine-title">${machine.name}</div>
                <div class="machine-cta">
                    <div class="btn">${LANG.get('select')}</div>
                </div>
            </button>`;
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
        app.refreshStepList();
        app.changeContent('set-concime');
    }
    app.getStepHtml = function(step) {
        let html = '';
        let cssClass = 'is-selected';
        let stepParamsDisabled = (app.currentConcime && app.currentMachine ? false : true);

        html = `<div class="step-list">
            <button class="step ${('machine' === step ? cssClass : '')}" data-step="machine" onclick="APP.changeContent('set-machine');">
                <div class="step-number">1</div>
                <div class="step-title">${LANG.get('step-machine')}</div>
                <div class="step-subtitle">Set your spreader</div>
            </button>
            <button class="step ${('concime' === step ? cssClass : '')}" data-step="concime" onclick="APP.changeContent('set-concime');">
                <div class="step-number">2</div>
                <div class="step-title">${LANG.get('step-concime')}</div>
                <div class="step-subtitle">Set the product</div>
            </button>
            <button class="step ${(stepParamsDisabled ? 'is-disabled' : '')} ${('params' === step ? cssClass : '')}" data-step="params" onclick="APP.changeContent('set-params');">
                <div class="step-number">3</div>
                <div class="step-title">${LANG.get('step-params')}</div>
                <div class="step-subtitle">Set working parameters</div>
            </button>
            <button class="step ${(stepParamsDisabled ? 'is-disabled' : '')} ${('result' === step ? cssClass : '')}" data-step="result" onclick="APP.changeContent('result');">
                <div class="step-number">4</div>
                <div class="step-title">RESULT</div>
                <div class="step-subtitle"> </div>
            </button>
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
            html += `<button class="concime-type" onclick="APP.setConcimeType(this, '${concimeType}');">
                <div class="concime-type-img">
                    <img src="/img/concime-type/${concimeType}.jpg" alt="${concimeTypeName}" />
                </div>
                ${concimeTypeName}
            </button>`;
        }
        $concimeTypeList.innerHTML = html;

        html = '';
        for (const concimeId of Object.keys(concimeList)) {
            let concime = concimeList[concimeId];

            html += `<div class="concime" data-concime-type="${concime.type}" onclick="APP.setConcime('${concimeId}');">
                <div class="concime-img">
                    <img src="/img/concime/${concimeId}.png" alt="${concime.name}" />
                </div>
                <div class="concime-title">${concime.name}</div>
                <div class="concime-cta">
                    <button class="btn" >${LANG.get('select')}</button>
                </div>
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
    app.setConcimeType = function($el, concimeTypeId) {
        let $concimeTypeSelected = document.querySelector('.concime-type.is-selected');
        if($concimeTypeSelected) {
            $concimeTypeSelected.classList.remove('is-selected');
        }
        $el.classList.add('is-selected');

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
        app.refreshStepList();
        app.changeContent('set-params');
    }
    app.refreshStepList = function() {
        if(app.currentConcime && app.currentMachine) {
            let $paramsStep = document.querySelector('.step[data-step=params]');
            $paramsStep.classList.remove('is-disabled');
        }
    }

    // PARAMS
    app.initSetWorkingParameters = function($html) {
        let currentMachine = app.getMachine(app.currentMachine);


        let optionalTemplate = `<div class="optional-width" hidden>
            <input class="optional-width-checkbox switch" id="optionalWidth" name="optionalWidth" type="checkbox" onchange="APP.refreshMaxWorkingWidth();">
            <label class="optional-width-label" for="optionalWidth"></label>
        </div>`;
        let optionalHtml = '';
        //let $optionalWidth = $html.querySelector('.optional-width');
        if(currentMachine.widthOpt) {
            optionalHtml = `<div class="optional-width">
                <input class="optional-width-checkbox switch" id="optionalWidth" name="optionalWidth" type="checkbox" onchange="APP.refreshMaxWorkingWidth();">
                <label class="optional-width-label" for="optionalWidth">${LANG.get('working-optional-kit')}</label>
            </div>`;
            //$optionalWidth.removeAttribute('hidden');

            ////let $optionalCheck = $html.querySelector('.optional-width-check');
            //let $optionalLabel = $html.querySelector('.optional-width-label');
            //$optionalLabel.innerHTML = LANG.get('working-optional-kit');
        } else {
            //$optionalWidth.setAttribute('hidden', '');
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

        let $parameterList = $html.querySelector('.parameter-list');
        let html = '';
        for (const paramId of Object.keys(params)) {
            let param = params[paramId];

            html += `<div class="parameter parameter-${paramId}">
                <div class="parameter-title">${UTIL.capitalizeFirstLetter(paramId)}</div>
                ${(paramId === 'width' ? optionalHtml : '')}
                <div class="parameter-input">
                    <div class="parameter-text">
                        <input id="widthText" type="text" value="${param.min}">
                    </div>
                    <div class="parameter-slider">
                        <div class="parameter-max">${param.max}m</div>
                        <div class="parameter-min">${param.min}m</div>
                        <input id="widthRange" type="range" step="1" max="${param.max}" min="${param.min}" value="${param.min}" oninput="APP.refreshCheckLabel(this);">
                    </div>
                </div>


            </div>`;

            /*let param = params[paramId];
            let $parameterTitle = $html.querySelector('.parameter-' + paramId + ' .parameter-title');
            let $parameterSlider = $html.querySelector('.parameter-' + paramId + ' .parameter-slider input');
            let $parameterMax = $html.querySelector('.parameter-' + paramId + ' .parameter-max');
            let $parameterMin = $html.querySelector('.parameter-' + paramId + ' .parameter-min');

            $parameterTitle.innerHTML = UTIL.capitalizeFirstLetter(paramId);
            $parameterMin.innerHTML = param.min + 'm';
            $parameterSlider.setAttribute('min', param.min);
            $parameterMax.innerHTML = param.max + 'm';
            $parameterSlider.setAttribute('max', param.max);*/
        }
        $parameterList.innerHTML = html;

        $main.innerHTML = app.getStepHtml('params');
        $html.innerHTML = html;
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
                <div class="result-line"></div>
                <div class="result-value">${value}</div>
            </div>`;

            return template;
        }

        let html = '';

        let opening = app.getOpening(app.currentMachine, app.currentConcime);

        html += getResultHtml('openening', opening.opening);
        html += getResultHtml('kg/min', opening.kgMin);

        html += `<div class="result-separator"></div>`;
        html += getResultHtml('spreader', currentMachine.name);
        html += getResultHtml('discs height', '');
        html += getResultHtml('pto speed', '');

        html += `<div class="result-separator"></div>`;
        html += getResultHtml('family', currentConcime.type);
        html += getResultHtml('product', currentConcime.name);
        html += getResultHtml('form', currentConcime.shape);
        html += getResultHtml('weight', currentConcime.weight);

        html += `<div class="result-separator"></div>`;
        html += getResultHtml('working width', app.currentWorkingWidth);
        html += getResultHtml('speed', app.currentWorkingSpeed);
        html += getResultHtml('quantity', app.currentWorkingQuantity);
        $resultList.innerHTML = html;

        $main.innerHTML = app.getStepHtml('result');
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