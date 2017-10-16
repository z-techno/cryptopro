;(function () {
    // already loaded
    if(window.CryptoProCodeAsync) {
        return;
    }

    //~ Consts -----------------------------------------------------------------------------------------
    var CONSTS = I18N_ERROR_LOAD_CADESPLUGIN = "Плагин cadesplugin не доступен";
    UNDEFINED = -1;
    
    //~ Variable -----------------------------------------------------------------------------------------
    var variable = {
        cadespluginState: 0,                // Состояние загрузки cadesplugin
        certs: [],                          // Список сертификатов
        debug: false,                        // Режим расширенного логирования
        error: undefined,                   // Последняя ошибка
        queue: []							// Очередь функций на выполнение при готовности плагина
    };
    
    //~ Constrction -----------------------------------------------------------------------------------------
    construction = function() {
        //Нужно проверить совместимость с версией утилит
        if (!main || main.utils.varsionMajor != 1) {
            variable.error = {code: 601, message: "Не поддерживается данная версия классса утилит"};
            throw new Error(variable.error.message);
        }
        if (variable.debug) {
            cadesplugin.set_log_level(cadesplugin.LOG_LEVEL_DEBUG);
        } else {
        	cadesplugin.set_log_level(cadesplugin.LOG_LEVEL_INFO);
        }
    };

    //~ Private methods -------------------------------------------------------------------------------------
    var callCallBack = function(callback, args) {
    	if (callback instanceof Function) {
			callback.call(window, args);
    	}
    };
    
    //~ Public methods --------------------------------------------------------------------------------------
    publicMethod = {

		/**
         * Получить возможную причину отказа
         */
        setDebugEnable: function(debug) {
            variable.debug = debug;
            if (variable.debug) {
                cadesplugin.set_log_level(cadesplugin.LOG_LEVEL_DEBUG);
            }
        },
        
        /**
         * Получить версию плагина.
         * 
         * @return Объект с данными о плагине
         */
        getVersion: async function(callback, versionInit) {
            if (variable.debug) {
                console.log("CryptoProCodeAsync: Вызыван getVersion");
            }
            var version = main.utils.copyProperty(versionInit, {});
            
            try {
            	var oAbout = await cadesplugin.CreateObjectAsync("CAdESCOM.About");
            	console.log(oAbout);
            	var oVersion = await oAbout.PluginVersion;
            	
            	version.csp = await oVersion.toString();
			} catch (e) {
				version.csp = cryptoProAdapter.handlerException(e);
				if (variable.debug) {
	                console.log(e);
	            }
			}
            
			callCallBack(callback, version);
        },
        
        /**
         * Загрузить список сертификатов
         */
        loadCerts: async function(callback, storeUser, storeName, storeMaxAllowed) {
            var cert;
            var certsList = [];
            
            var oStore = await cadesplugin.CreateObjectAsync("CAdESCOM.Store");
            await oStore.Open();
            
            var all_certs = await oStore.Certificates;
            var certCnt = await all_certs.Count;
            for (var i = 1; i <= certCnt; i++) {
                try {
                    cert = this.oStore.Certificates.Item(i);
                    if (variable.debug) {
                        console.log("CryptoProAdapter: Вызыван getSigns: cert " + i);
                        console.log(cert);
                    }
                    certsList.push({id: "1", name: "2"});
                } catch (e) {
                    var err = "Ошибка при получении сертификата: " + handlerException(e);
                    certsList.push({id: UNDEFINED, name: err});
                }
            }
            await oStore.Close();
            callCallBack(callback, [certsList]);
        }
    };
    
    // init
    construction();
    window.CryptoProCodeAsync = publicMethod;
}());
