;(function () {
    // already loaded
    if(window.CryptoProCodeAsync) {
        return;
    }

    //~ Consts -----------------------------------------------------------------------------------------
    I18N_ERROR_LOAD_CADESPLUGIN = "Плагин cadesplugin не доступен";
    UNDEFINED = -1;
    
    //~ Variable -----------------------------------------------------------------------------------------
    variable = {
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
            this.variable.error = {code: 601, message: "Не поддерживается данная версия классса утилит"};
            throw new Error(this.variable.error.message);
        }
        if (this.variable.debug) {
            cadesplugin.set_log_level(cadesplugin.LOG_LEVEL_DEBUG);
        }
    };

    //~ Private methods -------------------------------------------------------------------------------------
    getObject = function(name, callback) {
    	
    };
    
    //~ Public methods --------------------------------------------------------------------------------------
    publicMethod = {

		/**
         * Получить возможную причину отказа
         */
        setDebugEnable: function(debug) {
            variable.debug = debug;
        },
        
        /**
         * Получить версию плагина.
         * 
         * @return Объект с данными о плагине
         */
        getVersion: function(callback) {
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
            	var oAbout = await cadesplugin.CreateObjectAsync("CAdESCOM.About");
            	console.log(oAbout);
            	var oVersion = await oAbout.PluginVersion;
            	
            	version.csp = await oVersion.toString();
			} catch (e) {
				version.csp = handlerException(e);
				console.log(e.stack);
			}
            
			if (callback instanceof Function) {
				callback.call(window, version);
        	}
            
        }
    };
    
    // init
    construction();
    window.CryptoProCodeAsync = publicMethod;
}());
