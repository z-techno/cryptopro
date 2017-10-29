;(function () {
    // already loaded
    if (window.CryptoProCode) {
        return;
    }

    //~ Consts -----------------------------------------------------------------------------------------
    var UNDEFINED = -1;
    
    //~ Variable -----------------------------------------------------------------------------------------
    var variable = {
        cadespluginState: 0,                // Состояние загрузки cadesplugin
        certs: [],                          // Список сертификатов
        debug: false,                        // Режим расширенного логирования
        error: undefined,                   // Последняя ошибка
        queue: []							// Очередь функций на выполнение при готовности плагина
    };
    
    //~ Constrction -----------------------------------------------------------------------------------------
    var construction = function() {
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
    var callbackError = function(callback, errorMessage, errorCode) {
    	var error = {
    			error: {
    				code: errorCode,
    				message: errorMessage
    			}
    	};
    	callback.call(window, error);
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
        	var certsList = [];
            var cert;
            var certPrivate;
            
            var oStore = cadesplugin.CreateObject("CAdESCOM.Store");
            oStore.Open(storeUser, storeName, storeMaxAllowed);
            
            var certificates = oStore.Certificates; 
            var certificatesCount = certificates.Count;
            for (var i = 1; i <= certificatesCount; i++) {
                try {
                	cert = certificates.Item(i);
                	if (variable.debug) {
                		console.log("CryptoProCode: запрашиваем сертификат с номером " + i);
                		console.log(JSON.stringify(cert));
                	}
                    if (!!cert.PrivateKey) {
                    	certPrivate = cert.PrivateKey;
                    } else {
                    	certPrivate = {};
                    }
                    
                    cert = {
                    	IssuerName: cert.IssuerName,
                    	SerialNumber: cert.SerialNumber,
                    	SubjectName: cert.SubjectName,
                    	Thumbprint: cert.Thumbprint,
                    	ValidFromDate: cert.ValidFromDate,
                    	ValidToDate: cert.ValidToDate,
                    	Version: cert.Version,
                    	IsValid: cert.IsValid().Result
                    };
                    
                    try {
                    	cert.PrivateKey = {
                    		ProviderName: certPrivate.ProviderName,
                    		ProviderType: certPrivate.ProviderType
                    	};
					} catch (e) {
						cert.PrivateKey = {
	                    		ProviderName: cryptoProAdapter.handlerException(e),
	                    		ProviderType: cryptoProAdapter.handlerException(e)
	                    };
					}
					
					try {
                    	cert.PrivateKey = main.utils.mergeProperty(cert.PrivateKey, {
                    		ContainerName: certPrivate.ContainerName,
                    		UniqueContainerName: certPrivate.UniqueContainerName
                    	});
					} catch (e) {
						cert.PrivateKey = main.utils.mergeProperty(cert.PrivateKey, {
	                    		ContainerName: cryptoProAdapter.handlerException(e),
	                    		UniqueContainerName: cryptoProAdapter.handlerException(e)
	                    });
					}
                    
                    if (variable.debug) {
                        console.log("CryptoProCode: " + JSON.stringify(cert));
                    }
                    certsList.push(cryptoProAdapter.processing(cert));
                    oStore.Close();
                } catch (e) {
                    var err = "Ошибка при получении сертификата: " + cryptoProAdapter.handlerException(e);
                    callbackError(callback, err);
                    try {
                    	oStore.Close();
					} catch (e) {
						// ignore
					}
					return;
                }
            }
            
            callCallBack(callback, certsList);
        },
        
        /**
         * Создаем подпись данных
         */
        createSign: function(callback, certThumbprint, data, params) {
            if (!params) {
                params = {};
            }
            var isAddTimeStamp = !!params.isAddTimeStamp;
            var isBinary = !!params.isBinary;
            var isDocName = !!params.docName;
            
            // Ищем подпись
            var oStore = cadesplugin.CreateObject("CAdESCOM.Store");
            oStore.Open(params.storeUser, params.storeName, params.storeMaxAllowed);
            var oCertificates = oStore.Certificates.Find(cadesplugin.CAPICOM_CERTIFICATE_FIND_SHA1_HASH, certThumbprint);
            if (oCertificates.Count == 0) {
            	callbackError(callback, "Не удалось найти сертификат с названием " + certThumbprint);
            	return;
            } else if (oCertificates.Count > 1) {
            	callbackError(callback, "Не уникальное название сертификата " + certThumbprint);
            	return;
            }
            var oCertificate = oCertificates.Item(1);
            
            // Создаем подписанное сообщение
            // Создаем объект CAdESCOM.CPSigner
            var oSigner = cadesplugin.CreateObject("CAdESCOM.CPSigner");
            oSigner.Certificate = oCertificate;
            oSigner.TSAAddress = params.tsaAddress; // Адрес службы штампов времени

            // Создаем объект CAdESCOM.CadesSignedData
            var oSignedData = cadesplugin.CreateObject("CAdESCOM.CadesSignedData");
            // Значение свойства ContentEncoding должно быть задано до заполнения свойства Content
            if (isBinary) {
            	// Данные будут перекодированы из Base64 в бинарный массив.
            	oSignedData.ContentEncoding = cadesplugin.CADESCOM_BASE64_TO_BINARY;
            }
            oSignedData.Content = data;
            
            try {
            	if (isAddTimeStamp) {
            		// Добавление информации о времени создания подписи
            		var Attribute = cadesplugin.CreateObject("CADESCOM.CPAttribute");
            		Attribute.Name = cadesplugin.CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME;
            		var oTimeNow = new Date();
            		Attribute.Value = main.utils.convert.convertDate(oTimeNow);
            		oSigner.AuthenticatedAttributes2.Add(Attribute);
            	}
			} catch (e) {
				var err = "Подпись не создана. Ошибка добавления атрибута времени: " + cadesplugin.getLastError(e);
            	callbackError(callback, err);
            	return;
			}

            // Вычисляем значение подписи, подпись будет перекодирована в BASE64
            try {
            	oSigner.Options = cadesplugin.CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN; // Сохраняет полную цепочку
            	var sSignedMessage = oSignedData.SignCades(oSigner, params.signType);
                callCallBack(callback, [sSignedMessage]);
            } catch (e) {
            	var err = "Подпись не создана. Ошибка: " + cadesplugin.getLastError(e);
            	callbackError(callback, err);
            }
        }
    };
    
    // init
    construction();
    window.CryptoProCode = publicMethod;
}());
