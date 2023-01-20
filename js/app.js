'use strict'

var UTIL = (function () {
    let util = {};

    util.capitalizeFirstLetter = function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
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

    let $main;

    app.init = function() {
        console.log('init');
        $main = document.querySelector('.main');

        if(app.debug) {
            app.currentMachine = 'david-compact';
            app.currentConcime = 'urea-granulare-46';
        }

        app.routes = [
            {   regex: '^$',
                template: 'index',
                callback: app.initIndex
            },
            {   regex: '^select-machine/?$',
                template: 'select-machine',
                callback: app.initSelectMachine
            },
            {   regex: '^select-concime/?$',
                template: 'select-concime',
                callback: app.initSelectConcime
            },
            {   regex: '^set-working-parameters/?$',
                template: 'set-working-parameters',
                callback: app.initSetWorkingParameters
            }
        ];

        // gestione hash
        window.addEventListener('hashchange', APP.onHashChange, false);
        APP.onHashChange();
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

    app.initSelectMachine = function($html) {
        let $machineList = $html.querySelector('.machine-list');
        let machineList = app.getMachine();

        let html = '';
        for (const machineId of Object.keys(machineList)) {
            let machine = machineList[machineId];

            html += `<div class="machine">
                <div class="machine-img">
                    <img src="/img/machine/${machineId}.jpg" alt="${machine.name}" />
                    <button onclick="APP.setMachine(${machineId});">${LANG.get('select')}</button>
                </div>
                ${machine.name}
            </div>`;
        }
        $machineList.innerHTML = html;

        $main.innerHTML = '';
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

        app.changeContent('select-concime');
    }

    /*
        CONCIME
    */
    app.initSelectConcime = function($html) {
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

        $main.innerHTML = '';
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

        app.changeContent('set-working-parameters');
    }

    app.initSetWorkingParameters = function($html) {
        let currentMachine = app.getMachine(app.currentMachine);
        let params = {
            'width': {
                min: currentMachine.widthMin,
                max: currentMachine.widthMax
            },
            'speed': {
                min: 6,
                max: 20
            },
            'quantity': {
                min: 1,
                max: 1000
            }
        };

        for (const paramId of Object.keys(params)) {
            let param = params[paramId];
            let $parameterTitle = $html.querySelector('.parameter-' + paramId + ' .parameter-title');
            let $parameterSlider = $html.querySelector('.parameter-' + paramId + ' .parameter-slider');
            let $parameterMax = $html.querySelector('.parameter-' + paramId + ' .parameter-max');
            let $parameterMin = $html.querySelector('.parameter-' + paramId + ' .parameter-min');

            $parameterTitle.innerHTML = UTIL.capitalizeFirstLetter(paramId);
            $parameterMin.innerHTML = param.min + 'm';
            $parameterSlider.setAttribute('min', param.min);
            $parameterMax.innerHTML = param.max + 'm';
            $parameterSlider.setAttribute('max', param.max);
        }

        $main.innerHTML = '';
        $main.append($html);

        return null;
    }

    app.getLang = function() {

    }

    return app;
})();

document.addEventListener("DOMContentLoaded", function() {
    LANG.init();
});