;(function () {
    // already loaded
    if (window.CryptoProCodeAsync) {
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
                    if (isPk == true) {
                    	pk = await cert.PrivateKey;
                    	try {
                    		certPrivate = {
                            		ProviderName: await pk.ProviderName,
                            		ProviderType: await pk.ProviderType
                        	};
						} catch (e) {
							certPrivate = {
                            		ProviderName: cryptoProAdapter.handlerException(e),
                            		ProviderType: cryptoProAdapter.handlerException(e)
                        	};
						}
						
						try {
                    		certPrivate = main.utils.mergeProperty(certPrivate, {
                        			ContainerName: await pk.ContainerName,
                            		UniqueContainerName: await pk.UniqueContainerName
                        	});
						} catch (e) {
							certPrivate = main.utils.mergeProperty(certPrivate, {
                        			ContainerName: cryptoProAdapter.handlerException(e),
                            		UniqueContainerName: cryptoProAdapter.handlerException(e)
                        	});
						}
                    } else {
                    	certPrivate = {};
                    }
                    
                    var validator = await cert.IsValid();
                    var isValid = await validator.Result;
                    cert = cryptoProAdapter.processing({
                    	IssuerName: await cert.IssuerName,
                    	PrivateKey: await certPrivate,
                    	SerialNumber: await cert.SerialNumber,
                    	SubjectName: await cert.SubjectName,
                    	Thumbprint: await cert.Thumbprint,
                    	ValidFromDate: await cert.ValidFromDate,
                    	ValidToDate: await cert.ValidToDate,
                    	Version: await cert.Version,
                    	IsValid: isValid
                    });
                    
                    if (variable.debug) {
                        console.log("CryptoProCodeAsync: " + JSON.stringify(cert));
                    }
                    certsList.push(cert);
                    await oStore.Close();
                } catch (e) {
                    var err = "Ошибка при получении сертификата: " + cryptoProAdapter.handlerException(e);
                    callbackError(callback, err);
                    try {
                    	await oStore.Close();
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
        createSign: async function(callback, certThumbprint, data, params) {
            if (!params) {
                params = {};
            }
            var isAddTimeStamp = !!params.isAddTimeStamp;
            var isBinary = !!params.isBinary;
            var isDocName = !!params.docName;
            
            // Ищем подпись
            var oStore = await cadesplugin.CreateObjectAsync("CAdESCOM.Store");
            await oStore.Open(params.storeUser, params.storeName, params.storeMaxAllowed);
            var oCertificates = await oStore.Certificates;
            var oCertFined = await oCertificates.Find(cadesplugin.CAPICOM_CERTIFICATE_FIND_SHA1_HASH, certThumbprint);
            var oCertFinedCount = await oCertFined.Count;
            if (oCertFinedCount == 0) {
            	callbackError(callback, "Не удалось найти сертификат с названием " + certThumbprint);
            	return;
            } else if (oCertFinedCount > 1) {
            	callbackError(callback, "Не уникальное название сертификата " + certThumbprint);
            	return;
            }
            var oCertificate = await oCertificates.Item(1);
            
            // Создаем подписанное сообщение
            // Создаем объект CAdESCOM.CPSigner
            var oSigner = await cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
            await oSigner.propset_Certificate(oCertificate);
            await oSigner.propset_TSAAddress(params.tsaAddress); // Адрес службы штампов времени

            // Создаем объект CAdESCOM.CadesSignedData
            var oSignedData = await cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
            // Значение свойства ContentEncoding должно быть задано до заполнения свойства Content
            if (isBinary) {
            	// Данные будут перекодированы из Base64 в бинарный массив.
            	//oSignedData.ContentEncoding = cadesplugin.CADESCOM_BASE64_TO_BINARY;
            	await oSignedData.propset_ContentEncoding(cadesplugin.CADESCOM_BASE64_TO_BINARY);
            }
            await oSignedData.propset_Content(data);
            
            try {
            	if (isAddTimeStamp) {
                	// Добавление информации о времени создания подписи
                	var Attribute = await cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");
                	await Attribute.propset_Name(cadesplugin.CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME);
                	var oTimeNow = new Date();
                	await Attribute.propset_Value(main.utils.convert.convertDate(oTimeNow));
                	var authAttr2 = await oSigner.AuthenticatedAttributes2;
                	await authAttr2.Add(Attribute);
                }	
			} catch (e) {
				var err = "Подпись не создана. Ошибка добавления атрибута времени: " + cadesplugin.getLastError(e);
            	callbackError(callback, err);
            	return;
			}
            

            // Вычисляем значение подписи, подпись будет перекодирована в BASE64
            try {
            	await oSigner.propset_Options(cadesplugin.CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN); // Сохраняет полную цепочку.
            	var sSignedMessage = await oSignedData.SignCades(oSigner, params.signType);
            	callCallBack(callback, [sSignedMessage]);
            } catch (e) {
            	var err = "Подпись не создана. Ошибка: " + cadesplugin.getLastError(e);
            	callbackError(callback, err);
            }
        }
    };
    
    // init
    construction();
    window.CryptoProCodeAsync = publicMethod;
}());
