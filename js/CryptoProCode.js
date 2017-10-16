;(function () {
    // already loaded
    if(window.CryptoProCode) {
        return;
    }

    //~ Consts -----------------------------------------------------------------------------------------
    I18N_ERROR_LOAD_CADESPLUGIN = "Плагин cadesplugin не доступен";
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
        getVersion: function(callback, versionInit) {
            if (variable.debug) {
                console.log("CryptoProCode: Вызыван getVersion");
            }
            var version = main.utils.copyProperty(versionInit, {});
            
            try {
            	var oAbout = cadesplugin.CreateObject("CAdESCOM.About");
            	var currentPluginVersion = oAbout.PluginVersion;
            	if (typeof (currentPluginVersion) == "object") {
        			currentPluginVersion = currentPluginVersion.toString();
        		}
            	
        		if (typeof (currentPluginVersion) == "undefined") {
        			currentPluginVersion = oAbout.Version;
        		}
        		
        		if (!!currentPluginVersion) {
        			version.csp = currentPluginVersion;
        		} else {
        			version.csp = "Не удалось определить";
        		}
			} catch (e) {
				version.csp = cryptoProAdapter.handlerException(e);
				if (variable.debug) {
	                console.log(e);
	            }
			}
            
			callCallBack(callback, [version]);
        },
        
        /**
         * Загрузить список сертификатов
         */
        loadCerts: function(callback, storeUser, storeName, storeMaxAllowed) {
            var cert;
            var certsList = [];
            
            var oStore = cadesplugin.CreateObject("CAdESCOM.Store");
            oStore.Open(storeUser, storeName, storeMaxAllowed);
            
            var certCnt = oStore.Certificates.Count;
            for (var i = 1; i <= certCnt; i++) {
                try {
                    cert = oStore.Certificates.Item(i);
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
            oStore.Close();
            callCallBack(callback, [certsList]);
        },
        
        /**
         * Создаем подпись данных
         */
        createSign: function(callback, storeUser, storeName, storeMaxAllowed, signId, data, params) {
            if (!params) {
                params = {};
            }
            var isAddTimeStamp = !!params.isAddTimeStamp;
            var isBinary = !!params.isBinary;
            var isDocName = !!params.docName;
            
            // Ищем подпись
            var oStore = cadesplugin.CreateObject("CAdESCOM.Store");
            oStore.Open(storeUser, storeName, storeMaxAllowed);
            var oCertificates = oStore.Certificates.Find(cadesplugin.CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME, signId);
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
            // Значение свойства ContentEncoding должно быть задано до заполнения свойства Content
            // Данные будут перекодированы из Base64 в бинарный массив.
            //oSignedData.ContentEncoding = CADESCOM_BASE64_TO_BINARY;
            oSignedData.Content = text;
            
            // Добавление информации о времени создания подписи
            var Attribute = CreateObject("CADESCOM.CPAttribute");
            Attribute.Name = cadesplugin.CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME;
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
        }
    };
    
    // init
    construction();
    window.CryptoProCode = publicMethod;
}());
