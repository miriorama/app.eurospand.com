'use strict'

var UTIL = (function () {
    let util = {};

    util.capitalizeFirstLetter = function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    util.round = function(num) {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    }

    util.guid = function() {
		return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
		  (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
		);
	}

    return util;
})();

var LANG = (function () {
    let lang = {
        data: null,
        _current: null,
        keys: ['es','bu','de','en','fr','gr','hu','it','nl','pt','ro','ru','tr'],
    };

    const LOCAL_STORAGE_LANG = 'eurospandLang';

    lang.init = function(params) {
        let defaultParams = {
            lang: null,
        };
        params = Object.assign({}, defaultParams, params);

        // elimino eventuale script di lingua precedente
        let $prevLang = document.querySelector('[data-lang]');
        if($prevLang) {
            $prevLang.remove();
        }

        // se ho una lingua salvata nel localstorage
        if(!params.lang) {
            let localLang = localStorage.getItem(LOCAL_STORAGE_LANG);
            if(localLang) {
                params.lang = localLang;
            }
        }

        // altrimenti provo a prenderla dal browser
        if(!params.lang) {
            params.lang = LANG.detect();
        }

        // se proprio non becco nulla metto inglese
        if(!params.lang) {
            params.lang = 'en';
        }

        let langPath = 'lang/' + params.lang + '.js';
        let script = document.createElement('script');
        script.setAttribute('data-lang', params.lang);
        script.onload = function () {
            lang.data = LANG_DATA;
            APP.init();
        };
        script.src = langPath;
        document.head.appendChild(script);

        //lang.data = API(langPath);
        lang._current = params.lang;

        localStorage.setItem(LOCAL_STORAGE_LANG, lang.current());
    }

    lang.current = function() {
        return lang._current;
    }

    lang.get = function(key) {
        return lang.data[key];
    }

    lang.list = function() {
        return [
            {
                id: 'bu',
                name: 'bu'
            },
            {
                id: 'de',
                name: 'de'
            },
            {
                id: 'en',
                name: 'en'
            },
            {
                id: 'es',
                name: 'es'
            },
            {
                id: 'fr',
                name: 'fr'
            },
            {
                id: 'gr',
                name: 'gr'
            },
            {
                id: 'hu',
                name: 'hu'
            },
            {
                id: 'it',
                name: 'it'
            },
            {
                id: 'nl',
                name: 'nl'
            },
            {
                id: 'pt',
                name: 'pt'
            },
            {
                id: 'ro',
                name: 'ro'
            },
            {
                id: 'ru',
                name: 'ru'
            },
            {
                id: 'tr',
                name: 'tr'
            }
        ];
    }

    lang.change = function(id) {
        return false;

        lang.init({
            lang: id
        });
    }

    lang.detect = function() {
        let ret = null;

        try {
            ret = navigator.language.substring(0, 2);
        } catch (error) {
            ret = null;
        }

        return ret;
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
        debug: false,
        currentMachine: null,
        currentConcime: null,
        concimeTypeList: ['fertilizzanti', 'semi', 'lumachicida']
    }

    const LOCAL_STORAGE_SAVED_WORKS = 'eurospandSavedWorks';

    let $body, $main, $menu, $mainTitle, $mainSubtitle;

    app.init = function() {
        $body = document.querySelector('body');
        $main = document.querySelector('.main');
        $menu = document.querySelector('.menu');
        $mainTitle = document.querySelector('.title .red');
        $mainSubtitle = document.querySelector('.title .gray');

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
            {   regex: '^machine/(?<id>[^/]*)/?$',
                template: 'machine-detail',
                callback: app.initMachine,
                animate: false
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
            },
            {   regex: '^flow-factor/?$',
                template: 'flow-factor',
                callback: app.initFlowFactor
            },
            {   regex: '^saved-works/?$',
                template: 'saved-works',
                callback: app.initSavedWorks
            },
            {   regex: '^set-language/?$',
                template: 'set-language',
                callback: app.initSetLanguage
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
        let animationTime = 200;

        for (const route of app.routes) {
            let regex = new RegExp(route.regex, 'i');
            let match = app.hash.match(regex);

            if(match) {
                /*if(route.hasOwnProperty(animate)) {
                    animate = route.animate;
                }*/
                let params = match.groups;
                let $template = document.querySelector(`template[data-section=${route.template}]`);
                if ($template) {
                    if(app.currentTemplate) {
                    app.previousTemplate = app.currentTemplate;
                    }
                    app.currentTemplate = route.template;

                    if(app.currentTemplate !== 'machine-detail') {
                        //app.hideMachine();
                    }

                    let $html = $template.content.cloneNode(true);

                    if(animate) {
                        document.body.classList.remove('animate');

                        if(app.previousTemplate) {
                            setTimeout(function() {
                                hide();
                            }, animationTime);
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

                        //$main.setAttribute('data-section', route.template);

                        if(animate) {
                            window.setTimeout(function() {
                                show();
                            }, animationTime);
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

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    app.changeContent = function(content) {
        location.hash = content;
    }
    app.initIndex = function($html) {
        $main.innerHTML = '';
        $main.append($html);

        return null;
    }
    app.setTitle = function(title, subtitle) {
        if($mainTitle) {
            $mainTitle.innerHTML = title;
        }

        if($mainSubtitle && subtitle) {
            $mainSubtitle.innerHTML = subtitle;
        }
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
        $body.classList.add('is-overflow');
    }
    app.menuClose = function() {
        $menu.classList.remove('is-visible');
        $body.classList.remove('is-overflow');
    }

    // STEP
    app.getStepHtml = function(step) {
        let $html = document.createElement('div');
        $html.classList.add('step-list');

        let cssClass = 'is-selected';


        let title = "Calculate opening";
        let subtitle = LANG.get('step-description-' + step);
        let html = `<div class="title">
            <div class="red">
                <span>${title}</span>
            </div>

            <div class="gray" onclick="APP.hideConcime();">
                ${subtitle}
            </div>
        </div>`;

        html += `<div class="step-list">
            <button class="step" data-step="machine" onclick="APP.changeContent('set-machine');">
                <div class="step-number">1</div>
                <div class="step-title">${LANG.get('step-machine')}</div>
                <div class="step-img">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-funnel" viewBox="0 0 16 16"><path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2zm1 .5v1.308l4.372 4.858A.5.5 0 0 1 7 8.5v5.306l2-.666V8.5a.5.5 0 0 1 .128-.334L13.5 3.308V2h-11z"/></svg>
                </div>
                <div class="step-subtitle">Set your spreader</div>
            </button>
            <button class="step" data-step="concime" onclick="APP.changeContent('set-concime');">
                <div class="step-number">2</div>
                <div class="step-title">${LANG.get('step-concime')}</div>
                <div class="step-img">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-flower2" viewBox="0 0 16 16"><path d="M8 16a4 4 0 0 0 4-4 4 4 0 0 0 0-8 4 4 0 0 0-8 0 4 4 0 1 0 0 8 4 4 0 0 0 4 4zm3-12c0 .073-.01.155-.03.247-.544.241-1.091.638-1.598 1.084A2.987 2.987 0 0 0 8 5c-.494 0-.96.12-1.372.331-.507-.446-1.054-.843-1.597-1.084A1.117 1.117 0 0 1 5 4a3 3 0 0 1 6 0zm-.812 6.052A2.99 2.99 0 0 0 11 8a2.99 2.99 0 0 0-.812-2.052c.215-.18.432-.346.647-.487C11.34 5.131 11.732 5 12 5a3 3 0 1 1 0 6c-.268 0-.66-.13-1.165-.461a6.833 6.833 0 0 1-.647-.487zm-3.56.617a3.001 3.001 0 0 0 2.744 0c.507.446 1.054.842 1.598 1.084.02.091.03.174.03.247a3 3 0 1 1-6 0c0-.073.01-.155.03-.247.544-.242 1.091-.638 1.598-1.084zm-.816-4.721A2.99 2.99 0 0 0 5 8c0 .794.308 1.516.812 2.052a6.83 6.83 0 0 1-.647.487C4.66 10.869 4.268 11 4 11a3 3 0 0 1 0-6c.268 0 .66.13 1.165.461.215.141.432.306.647.487zM8 9a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>
                </div>
                <div class="step-subtitle">Set the product</div>
            </button>
            <button class="step" data-step="params" onclick="APP.changeContent('set-params');">
                <div class="step-number">3</div>
                <div class="step-title">${LANG.get('step-params')}</div>
                <div class="step-img">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sliders" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M11.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM9.05 3a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0V3h9.05zM4.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM2.05 8a2.5 2.5 0 0 1 4.9 0H16v1H6.95a2.5 2.5 0 0 1-4.9 0H0V8h2.05zm9.45 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-2.45 1a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0v-1h9.05z"/></svg>
                </div>
                <div class="step-subtitle">Set working parameters</div>
            </button>
            <button class="step" data-step="result" onclick="APP.changeContent('result');">
                <div class="step-number">4</div>
                <div class="step-title">RESULT</div>
                <div class="step-img">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-list-check" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3.854 2.146a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708L2 3.293l1.146-1.147a.5.5 0 0 1 .708 0zm0 4a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708L2 7.293l1.146-1.147a.5.5 0 0 1 .708 0zm0 4a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 0 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0z"/></svg>
                </div>
                <div class="step-subtitle">Result</div>
            </button>
        </div>`;
        $html.innerHTML = html;

        let $step = $html.querySelector(`[data-step=${step}]`);
        $step.classList.add('is-selected');

        let stepParamsDisabled = (app.currentConcime && app.currentMachine ? false : true);
        let $stepParams = $html.querySelector(`[data-step=params]`);
        let $stepResult = $html.querySelector(`[data-step=result]`);
        if(stepParamsDisabled) {
            $stepParams.classList.add('is-disabled');
            $stepResult.classList.add('is-disabled');
        } else {
            $stepParams.classList.remove('is-disabled');
            $stepResult.classList.remove('is-disabled');
        }

        if(app.currentMachine) {
            let $stepMachine = $html.querySelector(`[data-step=machine]`);
            $stepMachine.classList.add('is-set');
            let $machineTitle = $html.querySelector(`[data-step=machine] .step-subtitle`);
            $machineTitle.innerHTML = app.getMachine(app.currentMachine).name;
        }
        if(app.currentConcime) {
            let $stepConcime = $html.querySelector(`[data-step=concime]`);
            $stepConcime.classList.add('is-set');
            let $concimeTitle = $html.querySelector(`[data-step=concime] .step-subtitle`);
            $concimeTitle.innerHTML = app.getConcime(app.currentConcime).name;
        }

        if (app.currentWorkingWidth && app.currentWorkingSpeed && app.currentWorkingQuantity) {
            let $stepParams = $html.querySelector(`[data-step=params]`);
            $stepParams.classList.add('is-set');
        }

        /*let title = LANG.get('step-description-' + step);
        html += `<div class="page-title">
            ${title}
        </div>`*/

        return $html.innerHTML;
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
                    <img src="img/machine/${machineId}.jpg" alt="${machine.name}" />
                </div>
                <div class="machine-footer">

                    <div class="machine-info" onclick="event.stopPropagation();APP.showMachine('${machineId}');">
                        <img src="img/icons/info-white.svg" />
                    </div>
                        <div class="machine-title">
                            <div>
                            ${machine.name}
                            <small>${machine.subtitle}</small>
                            </div>
                        <img src="img/icons/chevron-right-white.svg" />
                    </div>
                </div>
            </button>`;
        }

        app.setTitle('Calculate opening', LANG.get('step-description-machine'));

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

        if(!app.currentConcime) {
            app.changeContent('set-concime');
        } else {
            app.changeContent('set-params');
        }
    }

    app.initMachine = function($html, params) {
        let machine = app.getMachine(params.id);

        let machineImg = 'machine-img';
        let machineTitle = 'machine-title';
        let machineSubtitle = 'machine-subtitle';
        let machineDesc = 'machine-desc';

        let html = `<div class="machine-detail">
            <button class="machine-close" onclick="APP.hideMachine();">
                <img src="img/icons/close.svg" alt="">
            </button>
            <div class="machine-img">
                <img src="img/machine/${params.id}.jpg" alt="${machine.name}" />
            </div>
            <div class="machine-title">
                ${machine.name}
            </div>
            <div class="machine-subtitle">
                ${machine.subtitle}
                </div>
            <div class="machine-desc">${machineDesc}</div>
        </div>`;

        let $div = document.createElement('div');
        $div.classList.add('machine-detail-container','is-visible');
        $div.innerHTML = html;

        $main.append($div);
        //$main.append($html);

        //document.querySelector('.machine-detail-container').classList.add('is-visible');

        return null;
    }
    app.showMachine = function(machineId) {
        let machine = app.getMachine(machineId);
        let langMachine = LANG.get(machineId);

        let html = `<div class="machine-detail">
            <div class="machine-title">
                ${machine.name}
                <small>${machine.subtitle}</small>

                <button class="machine-close" onclick="APP.hideMachine();">
                    <img src="img/icons/close-white.svg" alt="">
                </button>
            </div>
            <div class="machine-scroll">
                <div class="machine-img">
                    <img src="img/machine/${machineId}.jpg" alt="${machine.name}" />
                    <div class="machine-subtitle">
                        ${langMachine.subtitle}
                    </div>
                </div>

                <div class="machine-desc">
                    <b>${langMachine.shortDescription}</b>
                    ${langMachine.description}
                </div>
            </div>
        </div>`;

        let $div = document.createElement('div');
        $div.classList.add('machine-detail-container');
        $div.innerHTML = html;

        $main.append($div);

        setTimeout(() => {
            document.querySelector('.machine-detail-container').classList.add('is-visible');
        }, 300);

        return null;
    }
    app.hideMachine = function() {
        if(app.previousTemplate) {
            //app.changeContent(app.previousTemplate);
        }

        let $machineDetailContainer = document.querySelector('.machine-detail-container');
        if($machineDetailContainer) {
            $machineDetailContainer.classList.remove('is-visible');
            setTimeout(() => {
                $machineDetailContainer.remove();
            }, 300);
        }
    }

    // CONCIME
    app.initSetConcime = function($html) {
        let $concimeTypeList = $html.querySelector('.concime-type-list');
        let $concimeList = $html.querySelector('.concime-list');
        let concimeList = app.getConcime();

        // Tipi di concime
        let html = '<div class="concime-type-title">Filter by:</div>';
        for (const concimeType of app.concimeTypeList) {
            let concimeTypeName = UTIL.capitalizeFirstLetter(concimeType);
            html += `<button class="concime-type" onclick="APP.setConcimeType(this, '${concimeType}');">
                <div class="concime-type-img">
                    <img src="img/concime-type/${concimeType}.jpg" alt="${concimeTypeName}" />
                </div>
                ${concimeTypeName}
            </button>`;
        }
        $concimeTypeList.innerHTML = html;

        html = '';
        for (const concimeId of Object.keys(concimeList)) {
            let concime = concimeList[concimeId];

            html += `<button class="concime" data-concime-type="${concime.type}" onclick="APP.setConcime('${concimeId}');">
                <div class="concime-img">
                    <img src="img/concime/${concimeId}.png" alt="${concime.name}" />
                </div>
                <div class="concime-footer">
                    <div class="concime-info" onclick="event.stopPropagation();APP.showConcime('${concimeId}');">
                        <img src="img/icons/info-white.svg" />
                    </div>
                    <div class="concime-title">
                        <div>${concime.name}</div>
                        <img src="img/icons/chevron-right-white.svg" />
                    </div>
                </div>
            </button>`;
        }
        $concimeList.innerHTML = html;

        $main.innerHTML = app.getStepHtml('concime');
        $main.append($html);

        app.setTitle('Calculate opening', LANG.get('step-description-concime'));

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

        if(!app.currentMachine) {
            app.changeContent('set-machine');
        } else {
            app.changeContent('set-params');
        }
    }
    app.refreshStepList = function() {
        if(app.currentConcime && app.currentMachine) {
            let $paramsStep = document.querySelector('.step[data-step=params]');
            $paramsStep.classList.remove('is-disabled');
        }
    }
    app.showConcime = function(concimeId) {
        let concime = app.getConcime(concimeId);
        let langconcime = LANG.get(concimeId);

        let rows = [
            {category: 'Information'},
            {name: 'Family', value: concime.category || ''},
            {name: 'Country', value: concime.country || ''},
            {name: 'Form', value: concime.producer || ''},
            {name: 'Manufacturer', value: concime.producer || ''},
            {name: 'KG/DM3', value: concime.weight || ''},
            {category: 'Fractionation'},
            {name: '', value: ''},
            {name: '', value: ''},
            {category: 'Chemical composition'},
            {name: '', value: concime.chemicalComposition_it || ''},
        ];

        let propertyListHtml = '';
        for (const row of rows) {
            if(row.category) {
                propertyListHtml += `<div class="property-category">${row.category}</div>`;
            } else if(row.value) {
                propertyListHtml += `<div class="property">
                    <div class="property-name">${row.name}</div>
                    <div class="property-line"></div>
                    <div class="property-value">${row.value}</div>
                </div>`;
            }
        }

        let html = `<div class="concime-detail">
            <div class="concime-title">
                <small>${concime.type}</small>

                <button class="concime-close" onclick="APP.hideConcime();">
                    <img src="img/icons/close-white.svg" alt="">
                </button>
            </div>
            <div class="concime-scroll">
                <div class="concime-img">
                    <img src="img/concime/${concimeId}.png" alt="${concime.name}" />
                    <div class="concime-subtitle">
                        ${concime.name}
                    </div>
                </div>

                <div class="property-list">
                    ${propertyListHtml}
                </div>
            </div>
        </div>`;

        let $div = document.createElement('div');
        $div.classList.add('concime-detail-container');
        $div.innerHTML = html;

        $main.append($div);

        setTimeout(() => {
            document.querySelector('.concime-detail-container').classList.add('is-visible');
        }, 300);

        return null;
    }
    app.hideConcime = function() {
        if(app.previousTemplate) {
            //app.changeContent(app.previousTemplate);
        }

        let $machineDetailContainer = document.querySelector('.concime-detail-container');
        if($machineDetailContainer) {
            $machineDetailContainer.classList.remove('is-visible');
            setTimeout(() => {
                $machineDetailContainer.remove();
            }, 300);
        }
    }

    // PARAMS
    app.initSetWorkingParameters = function($html) {
        if(!app.currentMachine) {
            app.changeContent('set-machine');
        }
        if(!app.currentConcime) {
            app.changeContent('set-concime');
        }
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
                max: app.getMaxWidth(app.currentMachine, app.currentConcime),
                unit: 'm',
                current: app.currentWorkingWidth
            },
            'speed': {
                min: 6,
                max: 20,
                unit: 'km/h',
                current: app.currentWorkingSpeed
            },
            'quantity': {
                min: 3,
                max: 1000,
                unit: 'kg/ha',
                current: app.currentWorkingQuantity
            }
        };

        let $parameterList = $html.querySelector('.parameter-list');
        let html = '';
        for (const paramId of Object.keys(params)) {
            let param = params[paramId];
            let current = param.current || param.min;

            html += `<div class="parameter parameter-${paramId}" data-id="${paramId}">
                <div class="parameter-title">${UTIL.capitalizeFirstLetter(paramId)}</div>
                ${(paramId === 'width' ? optionalHtml : '')}
                <div class="parameter-input">
                    <div class="parameter-text">
                        <input id="widthText" type="text" value="${current}" onchange="APP.refreshCurrentParams(this);">
                    </div>
                    <div class="parameter-slider">
                        <div class="parameter-max">${param.max} ${param.unit}</div>
                        <div class="parameter-min">${param.min} ${param.unit}</div>
                        <input id="widthRange" type="range" step="1" max="${param.max}" min="${param.min}" value="${current}" oninput="APP.refreshCheckLabel(this);">
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

        app.currentWorkingWidth = document.querySelector('.parameter-width .parameter-slider input').value;
        app.currentWorkingSpeed = document.querySelector('.parameter-speed .parameter-slider input').value;
        app.currentWorkingQuantity = document.querySelector('.parameter-quantity .parameter-slider input').value;

        app.setTitle('Calculate opening', LANG.get('step-description-params'));

        return null;
    }
    app.refreshCheckLabel = function($el) {
        let $parameter = $el.closest('.parameter');
        let $textInput = $parameter.querySelector('.parameter-text input');

        let paramName = UTIL.capitalizeFirstLetter($parameter.getAttribute('data-id'));
        app['currentWorking' + paramName] = $el.value;

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
    app.refreshCurrentParams = function($el) {
        let $parameter = $el.closest('.parameter');
        let paramName = UTIL.capitalizeFirstLetter($parameter.getAttribute('data-id'));

        app['currentWorking' + paramName] = $el.value;
    }
    app.paramsCompute = function() {
        //app.currentWorkingWidth = document.querySelector('.parameter-width .parameter-slider input').value;
        //app.currentWorkingSpeed = document.querySelector('.parameter-speed .parameter-slider input').value;
        //app.currentWorkingQuantity = document.querySelector('.parameter-quantity .parameter-slider input').value;

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
        if(!app.currentMachine) {
            app.changeContent('set-machine');
        }
        if(!app.currentConcime) {
            app.changeContent('set-concime');
        }
        let currentMachine = app.getMachine(app.currentMachine);
        let currentConcime = app.getConcime(app.currentConcime);
        let $resultList = $html.querySelector('.result-list');

        function getResultHtml(name, value, isCategory = false) {
            /*let template = `<div class="property">
                <div class="result-text">${text}</div>
                <div class="result-line"></div>
                <div class="result-value">${value}</div>
            </div>`;*/

            let isImportant = (name.toLowerCase() === 'opening' ? true : false);

            let html = '';
            if(isCategory) {
                html += `<div class="property-category">${name}</div>`;
            } else {
                html += `<div class="property ${(isImportant ? 'is-important' : '')}">
                    <div class="property-name">${name}</div>
                    <div class="property-line"></div>
                    <div class="property-value">${value}</div>
                </div>`;
            }

            return html;
        }

        let html = '';

        let opening = app.getOpening(app.currentMachine, app.currentConcime);

        html += getResultHtml('Result', currentMachine.name, true);
        html += getResultHtml('Opening', opening.opening);
        html += getResultHtml('Kg/min', opening.kgMin);

        html += getResultHtml('Spreader', currentMachine.name, true);
        html += getResultHtml('Spreader', currentMachine.name);
        html += getResultHtml('Discs height', '');
        html += getResultHtml('Pto speed', '');

        html += getResultHtml('Concime', currentMachine.name, true);
        html += getResultHtml('Family', currentConcime.type);
        html += getResultHtml('Product', currentConcime.name);
        html += getResultHtml('Form', currentConcime.shape);
        html += getResultHtml('Weight', currentConcime.weight);

        html += getResultHtml('Working parameters', currentMachine.name, true);
        html += getResultHtml('Working width', app.currentWorkingWidth);
        html += getResultHtml('Speed', app.currentWorkingSpeed);
        html += getResultHtml('Quantity', app.currentWorkingQuantity);
        $resultList.innerHTML = '<div class="property-list">' + html + '</div>';

        $main.innerHTML = app.getStepHtml('result');
        $main.append($html);

        app.setTitle('Calculate opening', LANG.get('step-description-result'));

        return null;
    }
    app.saveResult = function() {
        let obj = {
            currentMachine: app.currentMachine,
            currentConcime: app.currentConcime,
            currentWorkingWidth: app.currentWorkingWidth,
            currentWorkingSpeed: app.currentWorkingSpeed,
            currentWorkingQuantity: app.currentWorkingQuantity,
            date: new Date().toISOString(),
            id: UTIL.guid()
        }

        let savedWorks = app.getSavedWorks();
        savedWorks.unshift(obj);

        localStorage.setItem(LOCAL_STORAGE_SAVED_WORKS, JSON.stringify(savedWorks));
        app.changeContent('saved-works');
    }


    // SAVED WORKS
    app.getSavedWorks = function() {
        let savedWorks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_SAVED_WORKS));
        if(!Array.isArray(savedWorks)) {
            savedWorks = [];
        }

        return savedWorks;
    }
    app.initSavedWorks = function() {
        let html = '';
        let $div = document.createElement('div');

        let savedWorks = app.getSavedWorks();
        for (const savedWork of savedWorks) {
            let attr = encodeURIComponent(JSON.stringify(savedWork));
            html += `
                <div class="saved-work">
                    <div class="saved-work-title" onclick="APP.loadSavedWork('${attr}');">${savedWork.date}</div>
                    <div class="saved-work-subtitle">${savedWork.date}</div>
                    <div class="saved-work-delete" onclick="APP.deleteSavedWork('${savedWork.id || 0}');">X</div>
                </div>`;
        }
        html = `<div class="saved-work-list">${html}</div>`

        $div.innerHTML = html;

        return $div;
    }
    app.loadSavedWork = function(obj) {
        obj = JSON.parse(decodeURIComponent(obj));
        app.currentMachine = obj.currentMachine;
        app.currentConcime = obj.currentConcime;
        app.currentWorkingWidth = obj.currentWorkingWidth;
        app.currentWorkingSpeed = obj.currentWorkingSpeed;
        app.currentWorkingQuantity = obj.currentWorkingQuantity;

        app.changeContent('result');
    }
    app.deleteSavedWork = function(id) {
        let savedWorks = app.getSavedWorks();

        let i = 0;
        for (const savedWork of savedWorks) {
            if(savedWork.id == id) {
                savedWorks.splice(i, 1);
                break;
            }
            i++;
        }

        localStorage.setItem(LOCAL_STORAGE_SAVED_WORKS, JSON.stringify(savedWorks));

        location.reload();
    }


    // FLOW FACTOR
    app.getFlowStepHtml = function(step) {
        let html = '';
        let cssClass = 'is-selected';
        let stepParamsDisabled = (app.currentConcime && app.currentMachine ? false : true);

        html = `<div class="step-list">
            <button class="step ${('machine' === step ? cssClass : '')}" data-step="machine" onclick="APP.changeContent('set-machine');">
                <div class="step-number">1</div>
                <div class="step-title">${LANG.get('step-machine')}</div>
                <div class="step-subtitle">Set your spreader</div>
            </button>
            <button class="step ${(stepParamsDisabled ? 'is-disabled' : '')} ${('params' === step ? cssClass : '')}" data-step="params" onclick="APP.changeContent('set-params');">
                <div class="step-number">2</div>
                <div class="step-title">${LANG.get('step-params')}</div>
                <div class="step-subtitle">Set parameters</div>
            </button>
            <button class="step ${(stepParamsDisabled ? 'is-disabled' : '')} ${('result' === step ? cssClass : '')}" data-step="result" onclick="APP.changeContent('result');">
                <div class="step-number">3</div>
                <div class="step-title">RESULT</div>
                <div class="step-subtitle"> </div>
            </button>
        </div>`;

        return html;
    }
    app.initFlowFactor = function($html) {
        $main.innerHTML = app.getFlowStepHtml('machine');
        $main.append($html);

        return null;
    }


    // LANG
    app.initSetLanguage = function() {
        let html = '';
        let $div = document.createElement('div');

        for (const lang of LANG.list()) {
            html += `
                    <div class="lang" onclick="LANG.change('${lang.id}');APP.changeContent('')">
                        <div class="lang-flag"><img src="img/lang/flag-${lang.id}.png" /></div>
                        <div class="lang-title">${lang.name}</div>
                    </div>`;
        }
        html = `<div class="lang-list">${html}</div>`

        $div.innerHTML = html;

        return $div;
    }


    return app;
})();

document.addEventListener("DOMContentLoaded", function() {
    LANG.init();
});