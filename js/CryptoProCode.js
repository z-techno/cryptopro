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
                    	Version: cert.Version
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
                    	cert.PrivateKey = {
                    		ContainerName: certPrivate.ContainerName,
                    		UniqueContainerName: certPrivate.UniqueContainerName
                    	};
					} catch (e) {
						cert.PrivateKey = {
	                    		ContainerName: cryptoProAdapter.handlerException(e),
	                    		UniqueContainerName: cryptoProAdapter.handlerException(e)
	                    };
					}
                    
                    if (variable.debug) {
                        console.log("CryptoProCode: " + JSON.stringify(cert));
                    }
                    certsList.push(cryptoProAdapter.processing(cert));
                } catch (e) {
                    var err = "Ошибка при получении сертификата: " + cryptoProAdapter.handlerException(e);
                    certsList.push({id: UNDEFINED, name: err});
                }
            }
            oStore.Close();
            callCallBack(callback, certsList);
        },
        
        /**
         * Создаем подпись данных
         */
        createSign: function(callback, storeUser, storeName, storeMaxAllowed, signSubjectName, data, params) {
            if (!params) {
                params = {};
            }
            var isAddTimeStamp = !!params.isAddTimeStamp;
            var isBinary = !!params.isBinary;
            var isDocName = !!params.docName;
            
            // Ищем подпись
            var oStore = cadesplugin.CreateObject("CAdESCOM.Store");
            oStore.Open(storeUser, storeName, storeMaxAllowed);
            var oCertificates = oStore.Certificates.Find(cadesplugin.CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME, signSubjectName);
            if (oCertificates.Count == 0) {
            	callCallBack(callback, ["Не удалось найти сертификат с названием " + signSubjectName]);
            } else if (oCertificates.Count > 1) {
            	callCallBack(callback, ["Не уникальное название сертификата " + signSubjectName]);
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
            if (isBinary) {
            	// Данные будут перекодированы из Base64 в бинарный массив.
            	oSignedData.ContentEncoding = cadesplugin.CADESCOM_BASE64_TO_BINARY;
            }
            oSignedData.Content = data;
            
            if (isAddTimeStamp) {
            	// Добавление информации о времени создания подписи
            	var Attribute = cadesplugin.CreateObject("CADESCOM.CPAttribute");
            	Attribute.Name = cadesplugin.CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME;
            	var oTimeNow = new Date();
            	Attribute.Value = main.utils.convert.convertDate(oTimeNow);
            	oSigner.AuthenticatedAttributes2.Add(Attribute);
            }

            // Вычисляем значение подписи, подпись будет перекодирована в BASE64
            var sSignedMessage;
            try {
                sSignedMessage = oSignedData.SignCades(oSigner, cadesplugin.CADESCOM_CADES_X_LONG_TYPE_1, true, cadesplugin.CADESCOM_ENCODE_BASE64);
            } catch (e) {
            	sSignedMessage = "Failed to create signature. Error: " + cadesplugin.getLastError(e);
            }
            callCallBack(callback, [sSignedMessage]);
        }
    };
    
    // init
    construction();
    window.CryptoProCode = publicMethod;
}());
