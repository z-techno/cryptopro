;(function () {
    // already loaded
    if(window.CryptoProCode) {
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
         * Загрузить список сертификатов
         */
        loadCerts: function() {
            var cert;
            var certsList = [];
            
            var oStore = cadesplugin.CreateObject("CAdESCOM.Store");
            this.oStore.Open(cadesplugin.CAPICOM_CURRENT_USER_STORE, cadesplugin.CAPICOM_MY_STORE, cadesplugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED);
            
            var certCnt = this.oStore.Certificates.Count;
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
            this.oStore.Close();
            variable.certs = certsList;
        },
        
        /**
         * Создаем подпись данных
         */
        createSign: function(signId, data, params) {
            if (!params) {
                params = {};
            }
            var isAddTimeStamp = !!params.isAddTimeStamp;
            var isBinary = !!params.isBinary;
            var isDocName = !!params.docName;
            
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
            // Значение свойства ContentEncoding должно быть задано до заполнения свойства Content
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
        }
    };
    
    // init
    construction();
    window.CryptoProCode = publicMethod;
}());
