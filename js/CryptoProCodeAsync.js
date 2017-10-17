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
        	var certsList = [];
            var cert;
            var isPk;
            var pk;
            var certPrivate;
            
            var oStore = await cadesplugin.CreateObjectAsync("CAdESCOM.Store");
            await oStore.Open();
            
            var allCerts = await oStore.Certificates;
            var certCnt = await allCerts.Count;
            for (var i = 1; i <= certCnt; i++) {
                try {
                    cert = await allCerts.Item(i);
                    if (variable.debug) {
                        console.log("CryptoProCodeAsync: запрашиваем сертификат с номером " + i);
                        console.log(cert);
                    }
                    isPk = await cert.HasPrivateKey();
                    if (!!isPk) {
                    	pk = await cert.PrivateKey;
                    	certPrivate = {
                    			ContainerName: await pk.ContainerName,
                        		ProviderName: await pk.ProviderName,
                        		ProviderType: await pk.ProviderType,
                        		UniqueContainerName: await pk.UniqueContainerName,
                    	}
                    } else {
                    	certPrivate = {};
                    }
                    
                    cert = cryptoProAdapter.processing({
                    	IssuerName: await cert.IssuerName,
                    	PrivateKey: await certPrivate,
                    	SerialNumber: await cert.SerialNumber,
                    	SubjectName: await cert.SubjectName,
                    	Thumbprint: await cert.Thumbprint,
                    	ValidFromDate: await cert.ValidFromDate,
                    	ValidToDate: await cert.ValidToDate,
                    	Version: await cert.Version
                    });
                    if (variable.debug) {
                        console.log("CryptoProCodeAsync: " + JSON.stringify(cert));
                    }
                    certsList.push(cert);
                } catch (e) {
                    var err = "Ошибка при получении сертификата: " + cryptoProAdapter.handlerException(e);
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
