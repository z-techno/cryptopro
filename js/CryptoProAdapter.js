/*
 * Код скрипта cadesplugin_api.js распространяется свободно 
 * и доступен на сайте для разработчиков http://cpdn.cryptopro.ru/default.asp?url=content/cades/plugin.html
 * 
 * Код CryptoProAdapter распространяется под лицензией Apache License Version 2.0, January 2004
 * полный текст https://github.com/z-techno/cryptopro/blob/master/LICENSE
 * 
 * Требования к адаптеру описаны: https://docs.google.com/document/d/1bvKOBX3OdXo0as5R594vnVc_hxJnXVUHPn46TeBJOLs/edit#
 * 
 * @author: Гончаров Никита
 * @company: Z-Tech
 * @veraion: 1.0
 * @date: 09.10.2017
 */
//-----------------~ cadesplugin_api.js (версия от 07.10.2017) ~---------------------------------------------
﻿;(function () {
    //already loaded
    if(window.cadesplugin)
        return;

    var pluginObject;
    var plugin_resolved = 0;
    var plugin_reject;
    var plugin_resolve;
    var isOpera = 0;
    var isFireFox = 0;
	var isEdge = 0;
    var failed_extensions = 0;

    var canPromise = !!window.Promise;
    var cadesplugin;

    if(canPromise)
    {
        cadesplugin = new Promise(function(resolve, reject)
        {
            plugin_resolve = resolve;
            plugin_reject = reject;
        });
    } else
    {
        cadesplugin = {};
    }
    
    function check_browser() {
        var ua= navigator.userAgent, tem, M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
        if(/trident/i.test(M[1])){
            tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
            return {name:'IE',version:(tem[1] || '')};
        }
        if(M[1]=== 'Chrome'){
            tem= ua.match(/\b(OPR|Edge)\/(\d+)/);
            if(tem!= null) return {name:tem[1].replace('OPR', 'Opera'),version:tem[2]};
        }
        M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
        if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
        return {name:M[0],version:M[1]};
    }
    var browserSpecs = check_browser();

    function cpcsp_console_log(level, msg){
        //IE9 не может писать в консоль если не открыта вкладка developer tools
        if(typeof(console) == 'undefined')
            return;
        if (level <= cadesplugin.current_log_level ){
            if (level == cadesplugin.LOG_LEVEL_DEBUG)
                console.log("DEBUG: %s", msg);
            if (level == cadesplugin.LOG_LEVEL_INFO)
                console.info("INFO: %s", msg);
            if (level == cadesplugin.LOG_LEVEL_ERROR)
                console.error("ERROR: %s", msg);
            return;
        }
    }

    function set_log_level(level){
        if (!((level == cadesplugin.LOG_LEVEL_DEBUG) ||
              (level == cadesplugin.LOG_LEVEL_INFO) ||
              (level == cadesplugin.LOG_LEVEL_ERROR))){
            cpcsp_console_log(cadesplugin.LOG_LEVEL_ERROR, "cadesplugin_api.js: Incorrect log_level: " + level);
            return;
        }
        cadesplugin.current_log_level = level;
        if (cadesplugin.current_log_level == cadesplugin.LOG_LEVEL_DEBUG)
            cpcsp_console_log(cadesplugin.LOG_LEVEL_INFO, "cadesplugin_api.js: log_level = DEBUG");
        if (cadesplugin.current_log_level == cadesplugin.LOG_LEVEL_INFO)
            cpcsp_console_log(cadesplugin.LOG_LEVEL_INFO, "cadesplugin_api.js: log_level = INFO");
        if (cadesplugin.current_log_level == cadesplugin.LOG_LEVEL_ERROR)
            cpcsp_console_log(cadesplugin.LOG_LEVEL_INFO, "cadesplugin_api.js: log_level = ERROR");
        if(isNativeMessageSupported())
        {
            if (cadesplugin.current_log_level == cadesplugin.LOG_LEVEL_DEBUG)
                window.postMessage("set_log_level=debug", "*");
            if (cadesplugin.current_log_level == cadesplugin.LOG_LEVEL_INFO)
                window.postMessage("set_log_level=info", "*");
            if (cadesplugin.current_log_level == cadesplugin.LOG_LEVEL_ERROR)
                window.postMessage("set_log_level=error", "*");
        }
    }

    function set_constantValues()
    {
        cadesplugin.CAPICOM_LOCAL_MACHINE_STORE = 1;
        cadesplugin.CAPICOM_CURRENT_USER_STORE = 2;
        cadesplugin.CADESCOM_LOCAL_MACHINE_STORE = 1;
        cadesplugin.CADESCOM_CURRENT_USER_STORE = 2;
        cadesplugin.CADESCOM_CONTAINER_STORE = 100;
        
        cadesplugin.CAPICOM_MY_STORE = "My";

        cadesplugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED = 2;

        cadesplugin.CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME = 1;

        cadesplugin.CADESCOM_XML_SIGNATURE_TYPE_ENVELOPED = 0;
        cadesplugin.CADESCOM_XML_SIGNATURE_TYPE_ENVELOPING = 1;
        cadesplugin.CADESCOM_XML_SIGNATURE_TYPE_TEMPLATE = 2;

        cadesplugin.XmlDsigGost3410UrlObsolete = "http://www.w3.org/2001/04/xmldsig-more#gostr34102001-gostr3411";
        cadesplugin.XmlDsigGost3411UrlObsolete = "http://www.w3.org/2001/04/xmldsig-more#gostr3411";
        cadesplugin.XmlDsigGost3410Url = "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34102001-gostr3411";
        cadesplugin.XmlDsigGost3411Url = "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr3411";

        cadesplugin.CADESCOM_CADES_DEFAULT = 0;
        cadesplugin.CADESCOM_CADES_BES = 1;
        cadesplugin.CADESCOM_CADES_T = 0x5;
        cadesplugin.CADESCOM_CADES_X_LONG_TYPE_1 = 0x5d;

        cadesplugin.CADESCOM_ENCODE_BASE64 = 0;
        cadesplugin.CADESCOM_ENCODE_BINARY = 1;
        cadesplugin.CADESCOM_ENCODE_ANY = -1;

        cadesplugin.CAPICOM_CERTIFICATE_INCLUDE_CHAIN_EXCEPT_ROOT = 0;
        cadesplugin.CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN = 1;
        cadesplugin.CAPICOM_CERTIFICATE_INCLUDE_END_ENTITY_ONLY = 2;

        cadesplugin.CAPICOM_CERT_INFO_SUBJECT_SIMPLE_NAME = 0;
        cadesplugin.CAPICOM_CERT_INFO_ISSUER_SIMPLE_NAME = 1;

        cadesplugin.CAPICOM_CERTIFICATE_FIND_SHA1_HASH = 0;
        cadesplugin.CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME = 1;
        cadesplugin.CAPICOM_CERTIFICATE_FIND_ISSUER_NAME = 2;
        cadesplugin.CAPICOM_CERTIFICATE_FIND_ROOT_NAME = 3;
        cadesplugin.CAPICOM_CERTIFICATE_FIND_TEMPLATE_NAME = 4;
        cadesplugin.CAPICOM_CERTIFICATE_FIND_EXTENSION = 5;
        cadesplugin.CAPICOM_CERTIFICATE_FIND_EXTENDED_PROPERTY = 6;
        cadesplugin.CAPICOM_CERTIFICATE_FIND_APPLICATION_POLICY = 7;
        cadesplugin.CAPICOM_CERTIFICATE_FIND_CERTIFICATE_POLICY = 8;
        cadesplugin.CAPICOM_CERTIFICATE_FIND_TIME_VALID = 9;
        cadesplugin.CAPICOM_CERTIFICATE_FIND_TIME_NOT_YET_VALID = 10;
        cadesplugin.CAPICOM_CERTIFICATE_FIND_TIME_EXPIRED = 11;
        cadesplugin.CAPICOM_CERTIFICATE_FIND_KEY_USAGE = 12;

        cadesplugin.CAPICOM_DIGITAL_SIGNATURE_KEY_USAGE = 128;

        cadesplugin.CAPICOM_PROPID_ENHKEY_USAGE = 9;

        cadesplugin.CAPICOM_OID_OTHER = 0;
        cadesplugin.CAPICOM_OID_KEY_USAGE_EXTENSION = 10;

        cadesplugin.CAPICOM_EKU_CLIENT_AUTH = 2;
        cadesplugin.CAPICOM_EKU_SMARTCARD_LOGON = 5;
        cadesplugin.CAPICOM_EKU_OTHER = 0;

        cadesplugin.CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME = 0;
        cadesplugin.CADESCOM_AUTHENTICATED_ATTRIBUTE_DOCUMENT_NAME = 1;
        cadesplugin.CADESCOM_AUTHENTICATED_ATTRIBUTE_DOCUMENT_DESCRIPTION = 2;
        cadesplugin.CADESCOM_ATTRIBUTE_OTHER = -1;

        cadesplugin.CADESCOM_STRING_TO_UCS2LE = 0;
        cadesplugin.CADESCOM_BASE64_TO_BINARY = 1;

        cadesplugin.CADESCOM_DISPLAY_DATA_NONE = 0;
        cadesplugin.CADESCOM_DISPLAY_DATA_CONTENT = 1;
        cadesplugin.CADESCOM_DISPLAY_DATA_ATTRIBUTE = 2;

        cadesplugin.CADESCOM_ENCRYPTION_ALGORITHM_RC2 = 0;
        cadesplugin.CADESCOM_ENCRYPTION_ALGORITHM_RC4 = 1;
        cadesplugin.CADESCOM_ENCRYPTION_ALGORITHM_DES = 2;
        cadesplugin.CADESCOM_ENCRYPTION_ALGORITHM_3DES = 3;
        cadesplugin.CADESCOM_ENCRYPTION_ALGORITHM_AES = 4;
        cadesplugin.CADESCOM_ENCRYPTION_ALGORITHM_GOST_28147_89 = 25;

        cadesplugin.CADESCOM_HASH_ALGORITHM_SHA1 = 0;
        cadesplugin.CADESCOM_HASH_ALGORITHM_MD2 = 1;
        cadesplugin.CADESCOM_HASH_ALGORITHM_MD4 = 2;
        cadesplugin.CADESCOM_HASH_ALGORITHM_MD5 = 3;
        cadesplugin.CADESCOM_HASH_ALGORITHM_SHA_256 = 4;
        cadesplugin.CADESCOM_HASH_ALGORITHM_SHA_384 = 5;
        cadesplugin.CADESCOM_HASH_ALGORITHM_SHA_512 = 6;
        cadesplugin.CADESCOM_HASH_ALGORITHM_CP_GOST_3411 = 100;
        cadesplugin.CADESCOM_HASH_ALGORITHM_CP_GOST_3411_2012_256 = 101;
        cadesplugin.CADESCOM_HASH_ALGORITHM_CP_GOST_3411_2012_512 = 102;

        cadesplugin.LOG_LEVEL_DEBUG = 4;
        cadesplugin.LOG_LEVEL_INFO = 2;
        cadesplugin.LOG_LEVEL_ERROR = 1;
    }

    function async_spawn(generatorFunc) {
      function continuer(verb, arg) {
        var result;
        try {
              result = generator[verb](arg);
        } catch (err) {
              return Promise.reject(err);
        }
        if (result.done) {
              return result.value;
        } else {
              return Promise.resolve(result.value).then(onFulfilled, onRejected);
        }
      }
      var generator = generatorFunc(Array.prototype.slice.call(arguments, 1));
      var onFulfilled = continuer.bind(continuer, "next");
      var onRejected = continuer.bind(continuer, "throw");
      return onFulfilled();
    }

    function isIE() {
        // var retVal = (("Microsoft Internet Explorer" == navigator.appName) || // IE < 11
        //     navigator.userAgent.match(/Trident\/./i)); // IE 11
        return (browserSpecs.name == 'IE' || browserSpecs.name == 'MSIE');
    }

    function isIOS() {
        var retVal = (navigator.userAgent.match(/ipod/i) ||
          navigator.userAgent.match(/ipad/i) ||
          navigator.userAgent.match(/iphone/i));
        return retVal;
    }

    function isNativeMessageSupported()
    {
        // В IE работаем через NPAPI
        if(isIE())
            return false;
        // В Edge работаем через NativeMessage
        if(browserSpecs.name == 'Edge') {
            isEdge = true;
            return true;
        }
        // В Chrome, Firefox и Opera работаем через асинхронную версию в зависимости от версии
        if(browserSpecs.name == 'Opera') {
            isOpera = true;
            if(browserSpecs.version >= 33){
                return true;
            }
            else{
                return false;
            }
        }
        if(browserSpecs.name == 'Firefox') {
            isFireFox = true;
            if(browserSpecs.version >= 52){
                return true;
            }
            else{
                return false;
            }
        }
        if(browserSpecs.name == 'Chrome') {
            if(browserSpecs.version >= 42){
                return true;
            }
            else{
                return false;
            }
        }
    }

    // Функция активации объектов КриптоПро ЭЦП Browser plug-in
    function CreateObject(name) {
        if (isIOS()) {
            // На iOS для создания объектов используется функция
            // call_ru_cryptopro_npcades_10_native_bridge, определенная в IOS_npcades_supp.js
            return call_ru_cryptopro_npcades_10_native_bridge("CreateObject", [name]);
        }
        if (isIE()) {
             // В Internet Explorer создаются COM-объекты
             if (name.match(/X509Enrollment/i)) {
                try {
                    // Объекты CertEnroll создаются через CX509EnrollmentWebClassFactory
                    var objCertEnrollClassFactory = document.getElementById("certEnrollClassFactory");
                    return objCertEnrollClassFactory.CreateObject(name);
                }
                catch (e) {
                    throw("Для создания обьектов X509Enrollment следует настроить веб-узел на использование проверки подлинности по протоколу HTTPS");
                }
            }
            // Объекты CAPICOM и CAdESCOM создаются через CAdESCOM.WebClassFactory
            try {
                var objWebClassFactory = document.getElementById("webClassFactory");
                return objWebClassFactory.CreateObject(name);
            }
            catch (e) {
                // Для версий плагина ниже 2.0.12538
                return new ActiveXObject(name);
            }
        }
        // создаются объекты NPAPI
        return pluginObject.CreateObject(name);
    }

    function decimalToHexString(number) {
        if (number < 0) {
            number = 0xFFFFFFFF + number + 1;
        }

        return number.toString(16).toUpperCase();
    }
    
    function GetMessageFromException(e) {
        var err = e.message;
        if (!err) {
            err = e;
        } else if (e.number) {
            err += " (0x" + decimalToHexString(e.number) + ")";
        }
        return err;
    }

    function getLastError(exception) {
        if(isNativeMessageSupported() || isIE() || isIOS() ) {
            return GetMessageFromException(exception);
        }

        try {
            return pluginObject.getLastError();
        } catch(e) {
            return GetMessageFromException(exception);
        }
    }

    // Функция для удаления созданных объектов
    function ReleasePluginObjects() {
        return cpcsp_chrome_nmcades.ReleasePluginObjects();
    }

    // Функция активации асинхронных объектов КриптоПро ЭЦП Browser plug-in
    function CreateObjectAsync(name) {
        return pluginObject.CreateObjectAsync(name);
    }

    //Функции для IOS
    var ru_cryptopro_npcades_10_native_bridge = {
      callbacksCount : 1,
      callbacks : {},

      // Automatically called by native layer when a result is available
      resultForCallback : function resultForCallback(callbackId, resultArray) {
            var callback = ru_cryptopro_npcades_10_native_bridge.callbacks[callbackId];
            if (!callback) return;
            callback.apply(null,resultArray);
      },

      // Use this in javascript to request native objective-c code
      // functionName : string (I think the name is explicit :p)
      // args : array of arguments
      // callback : function with n-arguments that is going to be called when the native code returned
      call : function call(functionName, args, callback) {
        var hasCallback = callback && typeof callback == "function";
        var callbackId = hasCallback ? ru_cryptopro_npcades_10_native_bridge.callbacksCount++ : 0;

        if (hasCallback)
          ru_cryptopro_npcades_10_native_bridge.callbacks[callbackId] = callback;

        var iframe = document.createElement("IFRAME");
            var arrObjs = new Array("_CPNP_handle");
            try{
        iframe.setAttribute("src", "cpnp-js-call:" + functionName + ":" + callbackId+ ":" + encodeURIComponent(JSON.stringify(args, arrObjs)));
            } catch(e){
                    alert(e);
            }
              document.documentElement.appendChild(iframe);
        iframe.parentNode.removeChild(iframe);
        iframe = null;
      }
    };

    function call_ru_cryptopro_npcades_10_native_bridge(functionName, array){
        var tmpobj;
        var ex;
        ru_cryptopro_npcades_10_native_bridge.call(functionName, array, function(e, response){
                                          ex = e;
                                          var str='tmpobj='+response;
                                          eval(str);
                                          if (typeof (tmpobj) == "string"){
                                                tmpobj = tmpobj.replace(/\\\n/gm, "\n");
                                            tmpobj = tmpobj.replace(/\\\r/gm, "\r");
                                          }
                                          });
        if(ex)
            throw ex;
        return tmpobj;
    }

    function show_firefox_missing_extension_dialog()
    {
        if (!window.cadesplugin_skip_extension_install)
        {  
            var ovr = document.createElement('div');
            ovr.id = "cadesplugin_ovr";
            ovr.style = "visibility: hidden; position: fixed; left: 0px; top: 0px; width:100%; height:100%; background-color: rgba(0,0,0,0.7)";
            ovr.innerHTML = "<div id='cadesplugin_ovr_item' style='position:relative; width:400px; margin:100px auto; background-color:#fff; border:2px solid #000; padding:10px; text-align:center; opacity: 1; z-index: 1500'>" +
                            "<button id='cadesplugin_close_install' style='float: right; font-size: 10px; background: transparent; border: 1; margin: -5px'>X</button>" +
                            "<p>Для работы КриптоПро ЭЦП Browser plugin на данном сайте необходимо расширение для браузера. Убедитесь, что оно у Вас включено или установите его." +
                            "<p><a href='https://www.cryptopro.ru/sites/default/files/products/cades/extensions/firefox_cryptopro_extension_latest.xpi'>Скачать расширение</a></p>" +
                            "</div>";
            document.getElementsByTagName("Body")[0].appendChild(ovr);
            document.getElementById("cadesplugin_close_install").addEventListener('click',function()
                                    {
                                        plugin_loaded_error("Плагин недоступен");
                                        document.getElementById("cadesplugin_ovr").style.visibility = 'hidden';
                                    });

            ovr.addEventListener('click',function()
                                {
                                    plugin_loaded_error("Плагин недоступен");
                                    document.getElementById("cadesplugin_ovr").style.visibility = 'hidden';
                                });
            ovr.style.visibility="visible";
        }
    }


    //Выводим окно поверх других с предложением установить расширение для Opera.
    //Если установленна переменная cadesplugin_skip_extension_install - не предлагаем установить расширение
    function install_opera_extension()
    {
        if (!window.cadesplugin_skip_extension_install)
        {
            document.addEventListener('DOMContentLoaded', function() {
                var ovr = document.createElement('div');
                ovr.id = "cadesplugin_ovr";
                ovr.style = "visibility: hidden; position: fixed; left: 0px; top: 0px; width:100%; height:100%; background-color: rgba(0,0,0,0.7)";
                ovr.innerHTML = "<div id='cadesplugin_ovr_item' style='position:relative; width:400px; margin:100px auto; background-color:#fff; border:2px solid #000; padding:10px; text-align:center; opacity: 1; z-index: 1500'>" +
                                "<button id='cadesplugin_close_install' style='float: right; font-size: 10px; background: transparent; border: 1; margin: -5px'>X</button>" +
                                "<p>Для работы КриптоПро ЭЦП Browser plugin на данном сайте необходимо установить расширение из каталога дополнений Opera." +
                                "<p><button id='cadesplugin_install' style='font:12px Arial'>Установить расширение</button></p>" +
                                "</div>";
                document.getElementsByTagName("Body")[0].appendChild(ovr);
                var btn_install = document.getElementById("cadesplugin_install");
                btn_install.addEventListener('click', function(event) {
                    opr.addons.installExtension("epebfcehmdedogndhlcacafjaacknbcm",
                        function()
                        {
                            document.getElementById("cadesplugin_ovr").style.visibility = 'hidden';
                            location.reload();
                        },
                        function(){})
                });
                document.getElementById("cadesplugin_close_install").addEventListener('click',function()
                        {
                            plugin_loaded_error("Плагин недоступен");
                            document.getElementById("cadesplugin_ovr").style.visibility = 'hidden';
                        });

                ovr.addEventListener('click',function()
                        {
                            plugin_loaded_error("Плагин недоступен");
                            document.getElementById("cadesplugin_ovr").style.visibility = 'hidden';
                        });
                ovr.style.visibility="visible";
                document.getElementById("cadesplugin_ovr_item").addEventListener('click',function(e){
                    e.stopPropagation();
                });
            });
        }else
        {
            plugin_loaded_error("Плагин недоступен");
        }
    }

    function firefox_or_edge_nmcades_onload() {
        cpcsp_chrome_nmcades.check_chrome_plugin(plugin_loaded, plugin_loaded_error);
    }

    function nmcades_api_onload () {
        window.postMessage("cadesplugin_echo_request", "*");
        window.addEventListener("message", function (event){
            if (typeof(event.data) != "string" || !event.data.match("cadesplugin_loaded"))
               return;
            if(isFireFox || isEdge)
            {
                // Для Firefox вместе с сообщением cadesplugin_loaded прилетает url для загрузки nmcades_plugin_api.js
                var url = event.data.substring(event.data.indexOf("url:") + 4);
                var fileref = document.createElement('script');
                fileref.setAttribute("type", "text/javascript");
                fileref.setAttribute("src", url);
                fileref.onerror = plugin_loaded_error;
                fileref.onload = firefox_or_edge_nmcades_onload;
                document.getElementsByTagName("head")[0].appendChild(fileref);
                // Для Firefox и Edge у нас только по одному расширению.
                failed_extensions++;
            }else {
                cpcsp_chrome_nmcades.check_chrome_plugin(plugin_loaded, plugin_loaded_error);
            }
        }, false);
    }

    //Загружаем расширения для Chrome, Opera, YaBrowser, FireFox, Edge
    function load_extension()
    {

        if(isFireFox || isEdge){
            // вызываем callback руками т.к. нам нужно узнать ID расширения. Он уникальный для браузера.
            nmcades_api_onload();
            return;
        } else {
            // в асинхронном варианте для chrome и opera подключаем оба расширения
            var fileref = document.createElement('script');
            fileref.setAttribute("type", "text/javascript");
            fileref.setAttribute("src", "chrome-extension://iifchhfnnmpdbibifmljnfjhpififfog/nmcades_plugin_api.js");
            fileref.onerror = plugin_loaded_error;
            fileref.onload = nmcades_api_onload;
            document.getElementsByTagName("head")[0].appendChild(fileref);
            fileref = document.createElement('script');
            fileref.setAttribute("type", "text/javascript");
            fileref.setAttribute("src", "chrome-extension://epebfcehmdedogndhlcacafjaacknbcm/nmcades_plugin_api.js");
            fileref.onerror = plugin_loaded_error;
            fileref.onload = nmcades_api_onload;
            document.getElementsByTagName("head")[0].appendChild(fileref);
        }
    }

    //Загружаем плагин для NPAPI
    function load_npapi_plugin()
    {
        var elem = document.createElement('object');
        elem.setAttribute("id", "cadesplugin_object");
        elem.setAttribute("type", "application/x-cades");
        elem.setAttribute("style", "visibility: hidden");
        document.getElementsByTagName("body")[0].appendChild(elem);
        pluginObject = document.getElementById("cadesplugin_object");
        if(isIE())
        {
            var elem1 = document.createElement('object');
            elem1.setAttribute("id", "certEnrollClassFactory");
            elem1.setAttribute("classid", "clsid:884e2049-217d-11da-b2a4-000e7bbb2b09");
            elem1.setAttribute("style", "visibility: hidden");
            document.getElementsByTagName("body")[0].appendChild(elem1);
            var elem2 = document.createElement('object');
            elem2.setAttribute("id", "webClassFactory");
            elem2.setAttribute("classid", "clsid:B04C8637-10BD-484E-B0DA-B8A039F60024");
            elem2.setAttribute("style", "visibility: hidden");
            document.getElementsByTagName("body")[0].appendChild(elem2);
        }
    }

    //Отправляем событие что все ок.
    function plugin_loaded()
    {
        plugin_resolved = 1;
        if(canPromise)
        {
            plugin_resolve();
        }else {
            window.postMessage("cadesplugin_loaded", "*");
        }
    }

    //Отправляем событие что сломались.
    function plugin_loaded_error(msg)
    {
        if(isNativeMessageSupported())
        {
            //в асинхронном варианте подключаем оба расширения, если сломались оба пробуем установить для Opera
            failed_extensions++;
            if(failed_extensions<2)
                return;
            if(isOpera && (typeof(msg) == 'undefined'|| typeof(msg) == 'object'))
            {
                install_opera_extension();
                return;
            }
        }
        if(typeof(msg) == 'undefined' || typeof(msg) == 'object')
            msg = "Плагин недоступен";
        plugin_resolved = 1;
        if(canPromise)
        {
            plugin_reject(msg);
        } else {
            window.postMessage("cadesplugin_load_error", "*");
        }
    }

    //проверяем что у нас хоть какое то событие ушло, и если не уходило кидаем еще раз ошибку
    function check_load_timeout()
    {
        if(plugin_resolved == 1)
            return;
        if(isFireFox)
        {
            show_firefox_missing_extension_dialog();
        }
        plugin_resolved = 1;
        if(canPromise)
        {
            plugin_reject("Истекло время ожидания загрузки плагина");
        } else {
            window.postMessage("cadesplugin_load_error", "*");
        }

    }

    //Вспомогательная функция для NPAPI
    function createPromise(arg)
    {
        return new Promise(arg);
    }

    function check_npapi_plugin (){
        try {
            var oAbout = CreateObject("CAdESCOM.About");
            plugin_loaded();
        }
        catch (err) {
            document.getElementById("cadesplugin_object").style.display = 'none';
            // Объект создать не удалось, проверим, установлен ли
            // вообще плагин. Такая возможность есть не во всех браузерах
            var mimetype = navigator.mimeTypes["application/x-cades"];
            if (mimetype) {
                var plugin = mimetype.enabledPlugin;
                if (plugin) {
                    plugin_loaded_error("Плагин загружен, но не создаются обьекты");
                }else
                {
                    plugin_loaded_error("Ошибка при загрузке плагина");
                }
            }else
            {
                plugin_loaded_error("Плагин недоступен");
            }
        }
    }

    //Проверяем работает ли плагин
    function check_plugin_working()
    {
        var div = document.createElement("div");
        div.innerHTML = "<!--[if lt IE 9]><iecheck></iecheck><![endif]-->";
        var isIeLessThan9 = (div.getElementsByTagName("iecheck").length == 1);
        if (isIeLessThan9) {
            plugin_loaded_error("Internet Explorer версии 8 и ниже не поддерживается");
            return;
        }

        if(isNativeMessageSupported())
        {
            load_extension();
        }else if(!canPromise) {
                window.addEventListener("message", function (event){
                    if (event.data != "cadesplugin_echo_request")
                       return;
                    load_npapi_plugin();
                    check_npapi_plugin();
                    },
                false);
        }else
        {
            if(document.readyState === "complete"){
                load_npapi_plugin();
                check_npapi_plugin();
            } else {
                window.addEventListener("load", function (event) {
                    load_npapi_plugin();
                    check_npapi_plugin();
                }, false);
            }
        }
    }

    function set_pluginObject(obj)
    {
        pluginObject = obj;
    }

    //Export
    cadesplugin.JSModuleVersion = "2.1.0";
    cadesplugin.async_spawn = async_spawn;
    cadesplugin.set = set_pluginObject;
    cadesplugin.set_log_level = set_log_level;
    cadesplugin.getLastError = getLastError;

    if(isNativeMessageSupported())
    {
        cadesplugin.CreateObjectAsync = CreateObjectAsync;
        cadesplugin.ReleasePluginObjects = ReleasePluginObjects;
    }

    if(!isNativeMessageSupported())
    {
        cadesplugin.CreateObject = CreateObject;
    }

    if(window.cadesplugin_load_timeout)
    {
        setTimeout(check_load_timeout, window.cadesplugin_load_timeout);
    }
    else
    {
        setTimeout(check_load_timeout, 20000);
    }

    set_constantValues();

    cadesplugin.current_log_level = cadesplugin.LOG_LEVEL_ERROR;
    window.cadesplugin = cadesplugin;
    check_plugin_working();
}());

//-----------------~ CryptoProAdapter ~---------------------------------------------------------------------
if(!!window.Promise) {
    cadesplugin.then(function () {
    		if (CryptoProAdapter) {
    			CryptoProAdapter.prototype.variable.state = 1;
    		} else {
    			throw new Error("Ошибка инициализации CryptoProAdapter");
    		}
           },
           function(error) {
        	   throw new Error("Ошибка инициализации cadesplugin: " + error);
           }
   );
} else {
    window.addEventListener("message", function (event){
        if (event.data == "cadesplugin_loaded") {
        	if (CryptoProAdapter) {
    			CryptoProAdapter.prototype.variable.cadespluginState = 1;
    		} else {
    			throw new Error("Ошибка инициализации CryptoProAdapter");
    		}
        } else if(event.data == "cadesplugin_load_error") {
        	throw new Error("Ошибка инициализации cadesplugin: " + error);
        }
        },
    false);
    window.postMessage("cadesplugin_echo_request", "*");
}

if (!main || !main.utils || !main.utils.createClass) {
	throw new Error("Не загружен файл Utils");
} 

﻿;(function () {
    // already loaded
    if(window.cryptoProAdapter)
        return;
    
	//~ Consts -----------------------------------------------------------------------------------------
    I18N_ERROR_LOAD_CADESPLUGIN = "Плагин cadesplugin не доступен";
    UNDEFAINED = -1;
    
	//~ Variable -----------------------------------------------------------------------------------------
    variable = {
		cadespluginState: 0,				// Состояние загрузки cadesplugin
		debug: true,						// Режим расширенного логирования
		error: undefined 					// Последняя ошибка
	};
	
    //~ Constrction -----------------------------------------------------------------------------------------
    construction = function() {
    	//Нужно проверить совместимость с версией утилит
		if (!main || main.utils.varsionMajor != 1) {
			this.variable.error = {code: 601, message: "Не поддерживается данная версия классса утилит"};
			throw new Error(this.variable.error.message);
		}
		if (this.variable.debug) {
			cadesplugin.set_log_level(cadesplugin.LOG_LEVEL_DEBUG);
		}
    };
    
	//~ Private methods -------------------------------------------------------------------------------------
    /**
	 * Логирование сообщения
	 * 
	 * @param message - Сообщение отправляемое в логгер
	 */
	log = function(message) {
		console.log("Log: " + message);
		try {
			var dump = {proxy: {}, user: {}, message: message};
			main.utils.copyProperty(this.variable, dump.proxy)
			dump.user.browsers = navigator.userAgent;
			dump.user.url = window.location.toString();
			dump.user.time = (new Date()).getTime();
			dump = JSON.stringify(dump);
			$.ajax({
				  async: true,
				  url: this.variable.env.loggerURL,
				  type: "POST",
				  data: dump,
				  success: function (data, textStatus) {}
			});
		} catch (e) {
			// ignore
		}
	};
	
	/**
	 * Проверка перед вызовом
	 */
	check = function() {
		if (! variable.cadespluginState) {
			this.variable.error = {code: 408, message: I18N_ERROR_LOAD_CADESPLUGIN};
			throw new Error(this.variable.error.message);
		}
		
	};
	
	//~ Public methods --------------------------------------------------------------------------------------
    publicMethod = {
		/**
		 * Выполнить когда плагин будет готов
		 */
		ready: function(funct) {
			
		},
		
		/**
		 * Получить возможную причину отказа
		 */
		getErrorMessage: function() {
			if (variable.debug) {
				console.log("CryptoProAdapter: Вызыван getErrorMessage");
			}
			return variable.error;
		},
		
		/**
		 * Получить версию плагина.
		 * 
		 * @return Объект с данными о плагине
		 */
		getVersion: function() {
			if (variable.debug) {
				console.log("CryptoProAdapter: Вызыван getVersion");
			}
			var version = {};
			version.adapter = "1.0";
			if (cadesplugin) {
				version.cadesplugin = cadesplugin.JSModuleVersion;
			} else {
				version.cadesplugin = "Плагин не сломался. Что-то пошло не так с CryptoProAdapter.js";
				return version;
			}
			
			try {
				check();
			} catch (e) {
				version.csp = UNDEFAINED;
				version.extendbrower = UNDEFAINED;
			}
			
			return version;
		},
		
		/**
		 * Получить список установленных сертификатов.
		 * 
		 * @return  Карта: Ключ - ид сертификата(certSubjectName), Значение - описанием сертификата
		 */
		getSigns: function() {
			if (variable.debug) {
				console.log("CryptoProAdapter: Вызыван getSigns");
			}
			check();
			
			var oStore = cadesplugin.CreateObject("CAdESCOM.Store");
			this.oStore.Open(cadesplugin.CAPICOM_CURRENT_USER_STORE, cadesplugin.CAPICOM_MY_STORE, cadesplugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED);
			var certCnt = this.oStore.Certificates.Count;
			
			var certsList = [];
			var cert;
			for (var i = 1; i <= certCnt; i++) {
				try {
		            cert = this.oStore.Certificates.Item(i);
		            if (variable.debug) {
						console.log("CryptoProAdapter: Вызыван getSigns: cert " + i);
						console.log(cert);
					}
		            certsList.push({id: "1", name: "2"});
		        } catch (ex) {
		        	var err = "Ошибка при получении сертификата: ";
		        	try {
		        		err += cadesplugin.getLastError(ex);
					} catch (e) {
						err += "" + ex + "(Не удалось поулчить детали: " + e + ")"
					}
		        	certsList.push({
		        		id: UNDEFAINED, 
		        		name: err
		        	});
		        }
			}
			this.oStore.Close();
			
			return certsList;
		},
		
		/**
		 * Проверка подписи.
		 * @param signId - ид сертификата
		 * @param params - 
		 * 
		 * @return Список в виде строк с описание ошибок
		 */
		validateSign: function(signId, params) {
			if (variable.debug) {
				console.log("CryptoProAdapter: Вызыван validateSign");
			}
			check();
			
			return undefined;
		},
		
		/**
		 * Подписать строковое представление
		 * @param signId - ид сертификата
		 * 
		 * @return Строка с подписью в формате BASE64
		 */
		signString: function(signId, text) {
			if (variable.debug) {
				console.log("CryptoProAdapter: Вызыван signString");
			}
			check();
			
			// Ищем подпись
			var oStore = cadesplugin.CreateObject("CAdESCOM.Store");
	        oStore.Open(CAPICOM_CURRENT_USER_STORE, CAPICOM_MY_STORE, CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED);
	        var oCertificates = oStore.Certificates.Find(CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME, signId);
	        if (oCertificates.Count == 0) {
	            alert("Certificate not found: " + certSubjectName);
	            return;
	        }
	        var oCertificate = oCertificates.Item(1);
			
	        // Создаем подписанное сообщение
	        // Создаем объект CAdESCOM.CPSigner
	        var oSigner = cadesplugin.CreateObject("CAdESCOM.CPSigner");
            oSigner.Certificate = oCertificate;
            oSigner.TSAAddress = "http://cryptopro.ru/tsp/";

	        // Создаем объект CAdESCOM.CadesSignedData
            var oSignedData = cadesplugin.CreateObject("CAdESCOM.CadesSignedData");
            // Данные будут перекодированы из Base64 в бинарный массив.
            //oSignedData.ContentEncoding = CADESCOM_BASE64_TO_BINARY;
            oSignedData.Content = text;
            
            // Добавление информации о времени создания подписи
    		var Attribute = CreateObject("CADESCOM.CPAttribute");
    		Attribute.Name = CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME;
    		var oTimeNow = new Date();
    		Attribute.Value = ConvertDate(oTimeNow);
    		oSigner.AuthenticatedAttributes2.Add(Attribute);

	        // Вычисляем значение подписи, подпись будет перекодирована в BASE64
            try {
                var sSignedMessage = oSignedData.SignCades(oSigner, CADESCOM_CADES_X_LONG_TYPE_1, true, CADESCOM_ENCODE_BASE64);
            } catch (ex) {
                alert("Failed to create signature. Error: " + cadesplugin.getLastError(ex));
                return;
            }

	        return sSignedMessage;
		},
		
		/**
		 * Подписать бинарные данные
		 * @param signId - ид сертификата
		 * 
		 * @return Строка с подписью
		 */
		signData: function(signId, data) {
			if (variable.debug) {
				console.log("CryptoProAdapter: Вызыван signData");
			}
			check();
			
			return undefined;
		},
		
    }
    
    // init
    construction();
    window.cryptoProAdapter = publicMethod;
}());
