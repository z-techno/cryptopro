﻿//-----------------~ ArcashaProxy ~--------------------------------------------------------------------------
var ArcashaProxy = main.utils.createClass();
var ERROR_SERVICE_ACCESS = "Сервис еще не доступен";
var ERROR_SERVICE_UNAUTHORIZED = "Авторизация не пройдена на серверах Аркаши";
var STATUS_CODE_OK = '{"readyState":4,"responseText":"","status":200,"statusText":"OK"}';
var CALL_BACK_TYPE = {pipe: 'PIPE', flash: "CALLBACKFLASH", fn: "CALLBACKFUNCTION"};

ArcashaProxy.prototype = {
		consts: {
			build: 5,
			serviceNamePrefix: 'ArcashaWeb',
			flashGameId: "game",
			env: {
				dev: {
					manual: true,
					host: new RegExp("((.*local.*)|(127\.0\.0\.1))"),
					serviceURL: '/services',
					backendURL: '192.168.198.23:8080/backend-restful-appl'
				},
				test: {
					host: new RegExp("(beta\.)(arcasha\.)(ru|su)"),
					serviceURL: '/arcasha/services',
					backendURL: 'backend.z-technology.ru/arcasha-beta'
				},
				prod: {
					host: new RegExp("^(?!q)[www\.]*arcasha\.(ru|su)"),
					serviceURL: '/arcasha/services',
					backendURL: 'backend.z-technology.ru/arcasha'
				}
			}
		},
		variable: {
			sessionjs: undefined, 				// Сессия запуска скрипта
			env: {
				name: undefined,				//
				serviceURL: undefined,			// URL of store services
				serviceBackendURL: undefined,	// URL of store services
				serviceImpl: undefined,			// Object service impl
				serviceClassName: undefined,	// Class name of service impl
				loggerURL: undefined,			// Линк на логгер
				timeURL: undefined				// Линк на получения точного времени
			},
			debug: true,				// 
			error: undefined,			// 
			available: false,			// 
			auth: false,				// 
			authTry: 0,					// 
			gameFlash: undefined,		// Flash object
			isGameFlashNotified: false,	// Флаг о том что сообщили Flash object о готовности
			gameId: undefined,			// String of gameId, and as flag access flash
			profile: {}					// 
		},
		
		//~ init --------------------------------------------------------------------------------------------
		initialize: function() {
			//Нужно проверить совместимость с версией утилит
			if (!main || main.utils.varsionMajor != 1) {
				this.variable.error = {code: 601, message: "Не поддерживается данная версия классса утилит"};
				throw new Error(this.variable.error.message);
			}
			if (!swfobject) {
				this.variable.error = {code: 601, message: "Не загружен классса утилит SWFObject"};
				throw new Error(this.variable.error.message);
			} else {
				var t = this;
				swfobject.registerObject(this.consts.flashGameId, "9.0.0", "expressInstall.swf", function() {
					console.log("swfobject.registerObject");
					t.checkFlash.apply(t);
				});
			}
			
			//Как то хитро пытаемся получить имя сервиса реализуцию прокси методы
			var hostName = main.utils.getHostName();
			if (this.variable.debug) {
				console.log("Proxy: проверяем хост " + hostName);
			}
			var checkEnv = 0;
			for (var envKey in this.consts.env) {
				var env = this.consts.env[envKey];
				if (env.host.test(hostName)) {
					var serviceName = undefined;
					checkEnv++;
					if (main.utils.isInIframe()) { // Нас запускают во фрейме, скорее всего это ВК, пока другим не кому
						serviceName = 'Vk';
					} else if (env.manual) { // Управления сервисов в ручном режиме
						if (window.location.hash.length == 0) {
							serviceName = 'TestOwnLand';
						} else if (window.location.hash.indexOf("test-vk") !== -1) {
							serviceName = 'TestVk';
						} else if (window.location.hash.indexOf("dev") !== -1) {
							serviceName = 'Dev';
						} else if (window.location.hash.indexOf("dummy-vk") !== -1) {
							serviceName = 'DummyVk';
						} else if (window.location.hash.indexOf("dummy") !== -1) {
							serviceName = 'DummyOwnLand';
						} else {
							alert("Не известный параметр запуска: " + window.location.hash);
							throw {code: 501, message: "Не известный параметр запуска: " + window.location.hash};
						}
					} else {
						serviceName = 'OwnLand';
					}
					
					if (env.serviceNameSuffix && !env.manual) {
						serviceName = env.serviceNameSuffix + serviceName;
					}
					
					this.variable.env.serviceClassName = this.consts.serviceNamePrefix + serviceName;
					this.variable.env.serviceURL = main.utils.generateUrl(env.serviceURL + "/" + this.variable.env.serviceClassName + ".js?v=" + this.consts.build);
					this.variable.env.serviceBackendURL = main.utils.generateUrl(env.backendURL);
					this.variable.env.loggerURL = main.utils.generateUrl(env.serviceURL + "/logger.php");
					this.variable.env.timeURL = main.utils.generateUrl(env.serviceURL + "/time.php");
				}
			}
			if (checkEnv != 1) {
				alert("Не смогли определить окружение. Что-то пошло не так!!!!");
				this.variable.error = {code: 500, message: "Не смогли определить окружение"};
				throw new Error(this.variable.error.message);
			}
			if (this.variable.debug) {
				console.log("Proxy: URL сервиса в хранилище " + this.variable.env.serviceURL);
				console.log("Proxy: Имя класса сервиса реализуцию прокси методы '" + this.variable.env.serviceClassName + "'");
				console.log("Proxy: URL бекенда: '" + this.variable.env.serviceBackendURL);
			}
			if (!this.variable.env.serviceClassName || !this.variable.env.serviceBackendURL) {
				alert("НАС СПИЗДИЛИ!!!!");
				this.variable.error = {code: 601, message: "Не поддерживаемая игровая площадка"};
				throw new Error(this.variable.error.message);
			}
			
			// Ветка загрузки сервиса
			main.utils.loadScript(this.variable.env.serviceURL, this, this.serviceLoadOk, this.serviceLoadError);
			// Ветка поиска/и/или ожидания flash
			// this.checkFlash.apply(this);
			
			this.variable.sessionjs = main.utils.generateUUID();
		},
		
		//~ Methods -----------------------------------------------------------------------------------------
		/**
		 * События выполняемые в случаи успешной загрузки сервиса
		 * 
		 */
		serviceLoadOk: function() {
			if (this.variable.debug) {
				console.log("Proxy: Инициализируем сервис " + this.variable.env.serviceClassName);
				console.log("Proxy: Передаем в качестве первого параметра " + this.variable.env.serviceBackendURL);
			}
			var t = this;
			var afterInitFn = function() {
				t.variable.available = true; // Устанавливаем флаг доступности сервиса
				t.checkFlashAndCallAllReady.apply(t);
				t.serviceAuthenticationDetect.apply(t);
			};
			
			try {
				var arg0 = {backendURL: this.variable.env.serviceBackendURL, afterInitFn:afterInitFn, debug: this.variable.debug};
				this.variable.env.serviceImpl = new window[this.variable.env.serviceClassName](arg0);
			} catch (e) {
				if (this.variable.debug) {
					console.log(e.stack);
				}
				this.variable.error = {message: "Произошли ошибки при инициализации сервиса: " + e.message};
				throw new Error(this.variable.error.message);
			}
			
			if ((!this.variable.env.serviceImpl.isSupportAfterInit
					|| !this.variable.env.serviceImpl.isSupportAfterInit instanceof Function)
					|| !this.variable.env.serviceImpl.isSupportAfterInit() ) {
				afterInitFn();
			}
		},
		
		/**
		 * События выполняемые при отказе в загрузке сервиса
		 * 
		 */
		serviceLoadError: function() {
			this.variable.error = {message: "Не удалось загрузить сервис"};
			if (this.variable.debug) {
				console.log("Proxy: Не загружен сервис " + this.variable.serviceClassName);
			}
			this.log("Не удалось загрузить сервис");
		},
		
		/**
		 * Проверить необходимость авторизации, и если авторизованы получить профиль игрока
		 * 
		 */
		serviceAuthenticationDetect: function() {
			if (this.variable.debug) {
				console.log("Proxy: Проверяем необходимость авторизации, запрасив профиль для этого");
			}
			try {
				var t = this;
				this.getProfile(CALL_BACK_TYPE.fn, function(id, pr, error) {
					if (pr && !main.utils.isEmptyObject(pr) && !error) {
						t.variable.auth = true;
						t.variable.profile = pr;
						t.serviceAuthenticationOk.apply(t);
					} else {
						console.log("Proxy: Запрашиваем авторизацию по причине: Пустого профиля");
						t.serviceAuthenticationing();
					}
				});
			} catch (e) {
				console.log("Proxy: Запрашиваем авторизацию по причине: " + e.message);
				this.serviceAuthenticationing();
			}
		},
		
		/**
		 * Процес авторизации
		 * 
		 */
		serviceAuthenticationing: function(failure) {
			var t = this;
			if (t.variable.debug) {
				console.log("Proxy: Запрос авторизации авторизационных данных");
			}
			if (failure && !main.utils.isEmptyObject(failure)) {
				t.variable.authTry = t.variable.authTry + 1; 
				console.log("Proxy: Попытка запроса № " + t.variable.authTry + ". Предыдущая завершилась неудачей: " + failure);
			}
			this.loginPage(
				function(result){ // Пользователь указал логин/пароль
					if (t.variable.debug) {
						console.log("Proxy: Ответ окна авторизации " + JSON.stringify(result));
					}
					try {
						if (t.variable.debug) {
							console.log("Proxy: Запрос авторизации" + JSON.stringify(result));
						}
						JSON.parse(t.authentication(result.login, result.password, CALL_BACK_TYPE.fn, function(id, response, error) {
							if (t.variable.debug) {
								console.log("Proxy: Ответ авторизации " + JSON.stringify(response));
							}
							if ((response && response.status == 200) || (response === "")) {
								console.log("Proxy: Запрос профиля");
								try {
									t.getProfile(CALL_BACK_TYPE.fn, function(id, result, error) {
										t.variable.profile = result;
										t.serviceAuthenticationOk.apply(t);
									});
									t.variable.auth = true;
								} catch (e) {
									t.serviceAuthenticationing.apply(t, [{code: 401, message: e.toString()}]);
								}
							} else if ((!response && !main.utils.isEmptyObject(error))
									|| (response.status == 400) || (response.status == 401) || (response.status == 0)) {
								var errorMessage = ERROR_SERVICE_UNAUTHORIZED;
								if (error && error.error && error.error.message) {
									errorMessage = error.error.message;
								}
								t.serviceAuthenticationing.apply(t, [{code: 401, error: errorMessage}]);
							} else {
								t.serviceAuthenticationError.apply(t, [response]);
							}
						}));
						
					} catch (e) {
						t.serviceAuthenticationError.apply(t, [e]);
					}
				},
				function(dataFromPage){ // Пользователь отказался указывать пароль
					if (t.variable.debug) {
						console.log("Proxy: Пользователь отказался указывать пароль");
					}
					t.serviceAuthenticationError.apply(t, [dataFromPage]);
				},
				function(dataFromPage){ // Пользователь решил зарегистрироваться
					if (t.variable.debug) {
						console.log("Proxy: Пользователь решил зарегистрироваться ");
					}
					t.serviceRegistering.apply(t, [dataFromPage]);
				},
				failure // Передаем возможные причины отказа, или пустой если первоначально
			);
		},
		
		/**
		 * Процес регистрации
		 * 
		 */
		serviceRegistering: function(failure) {
			var t = this;
			if (t.variable.debug) {
				console.log("Proxy: Запрос регистрации");
			}
			this.singupPage(
					function(dataFromPage){ // Пользователь указал необходимые данные для регистарции
						if (t.variable.debug) {
							console.log("Proxy: Ответ окна регистрации " + JSON.stringify(dataFromPage));
						}
						try {
							t.register(dataFromPage, CALL_BACK_TYPE.fn, function(id, response, error) {
								if (t.variable.debug) {
									console.log("Proxy: Ответ регистрации " + JSON.stringify(response) + ", error = " + JSON.stringify(error));
								}
								if (error && !main.utils.isEmptyObject(error)) {
									t.serviceRegistering.apply(t, [{code: 500, message: error.error.message}]);
								}
								t.variable.auth = true;
								t.variable.profile = response;
								t.serviceAuthenticationOk.apply(t);
							});
						} catch (e) {
							t.serviceRegistering.apply(t, [{code: 500, message: "Ошибка: " + e.toString()}]);
						}
					},
					
					function(dataFromPage){ // Пользователь отказался от регистрации
						t.serviceAuthenticationError.apply(t, [dataFromPage]);
					},
					
					function(){ // Пользователь решил ввести логин/пароль
						t.serviceAuthenticationing.apply(t, []);
					},
					
					failure // Передаем возможные причины отказа, или пустой если первоначально
			);
		},
		
		/**
		 * Событие: Авторизация пройдена успешно
		 */
		serviceAuthenticationOk: function() {
			if (this.variable.debug) {
				console.log("Proxy: serviceAuthenticationOk");
			}
			if (this.variable.env.serviceImpl.handlerAuthenticationSuccess instanceof Function) {
				this.variable.env.serviceImpl.handlerAuthenticationSuccess.apply(this.variable.env.serviceImpl, [this.variable.profile]);
			}
			this.checkFlashAndCallAuth(this.variable.profile);
			this.keepAlive();
		},

		/**
		 * Событие: Авторизация не пройдена
		 */		
		serviceAuthenticationError: function(e) {
			if (this.variable.debug) {
				console.log("Proxy: serviceLoadAuthError");
				console.log("Proxy: " + e.message);
				console.log("Proxy: " + e.stack);
			}
			this.log("Proxy: serviceLoadAuthError:" + e.message + ", stack: " + e.stack);
			this.variable.auth = false;
			this.variable.profile = {};
			var message = e.massage ? e.massage : e.statusText;
			this.variable.error = {code: 401, message: message};
			this.checkFlashAndCallAuth(undefined);
		},
		
		/**
		 * Проверка доступности flash
		 * 
		 */
		checkFlash: function() {
			if (this.variable.debug) {
				console.log("Proxy: првоеряем доступность Flash");
			}
			if (this.variable.gameFlash) {
				if (this.variable.debug) {
					console.log("Proxy: Flash уже активирована, вернем из кеша");
				}
				return this.variable.gameFlash;
			}
			
			var t = this;
			var timeOut = 0;
			var jobFinder = function(callback) {
				try {
					t.variable.gameFlash = swfobject.getObjectById(t.consts.flashGameId);
					t.variable.gameId = t.variable.gameFlash.getGameId();
					if (t.variable.debug) {
						console.log("Proxy: Get gameId: " + t.variable.gameId);
						// Синхронизируем режим дебага
						t.variable.gameFlash.setDebugMode(true);
					}
					if (callback instanceof Function) {
						callback.apply(this);
					}
					return true;
				} catch (e) {
					if (t.variable.debug) {
						console.log("Proxy: Не удалось получить Flash, причина: " + e + ", stack " + e.stack);
					}
					t.variable.gameFlash = undefined;
					return false;
				}
			};
			
			if (!jobFinder()) {
				var jobTimerId = setInterval(function(){
					if (t.variable.debug) {
						console.log("Proxy: Запуск задачи #" + jobTimerId + " поиска FLASH, попытка № " + timeOut);
					}
					
					jobFinder(function() {clearInterval(jobTimerId);});
					
					timeOut++;
					if (timeOut == 15) {
						clearInterval(jobTimerId);
						t.variable.gameId = -1; // Ставим флаг что отвалились
						t.variable.error = {code: 408, message: "Флеш-игра на странице не найдена"};
						throw t.variable.error;
					}
				}, 300);
			}
		},
		
		/**
		 * Дождаться доступности Flash и сообщить о готовности
		 * 
		 * @param c - Номер запуска
		 */
		checkFlashAndCallAllReady: function(c) {
			if (this.variable.debug) {
				console.log("Proxy: Пробуем сообщить флеш о готовности");
			}
			
			if (this.variable.gameId == -1) {
				if (this.variable.debug) {
					console.log("Proxy: Попытки сообщить флеш о готовности прекращены, получен флаг ошибки");
				}
				return false;
			} else if (!this.variable.gameId) {
				console.log("Proxy: Ожидаем флеш");
				c = (!c) ? 1 : (c + 1);
				console.log("Proxy: !!! c = " + c);
				if (c >= 15) {
					this.variable.gameId = -1;
				} else {
					var t = this;
					setTimeout(function() {t.checkFlashAndCallAllReady.apply(t, [c])}, 150);
				}
				return false;
			}
			
			this.variable.gameFlash.isAllReady(); // Сообщим Флешу что прокси готов
			this.variable.isGameFlashNotified = true;
			return true;
		},
		
		/**
		 * Дождаться доступности Flash и сообщить об авторизации
		 */
		checkFlashAndCallAuth: function(message) {
			if (this.variable.debug) {
				console.log("Proxy: Пробуем сообщить флеш об авторизации сообщением: " + JSON.stringify(message));
			}
			if (this.variable.gameId == -1) {
				if (this.variable.debug) {
					console.log("Proxy: Попытки сообщить флеш о готовности прекращены, получен флаг ошибки");
				}
				return;
 			} else if (!this.variable.gameId || !this.variable.isGameFlashNotified) {
				console.log("Proxy: checkFlashAndCallAuth - ожидаем флеш");
				var t = this;
				setTimeout(function() {t.checkFlashAndCallAuth.apply(t, [message])}, 500);
				return;
			}
			
			var profile = JSON.stringify(message);
			if (this.variable.debug) {
				console.log("Proxy: Вызываем флеш метод isAuthorized с параметром " + profile);
			}
			try {
				this.variable.gameFlash.isAuthorized(profile);
			} catch (e) {
				this.variable.error = {code: 501, message: "Метод isAuthorized не поддерживается данная версия игры: " + e.message};
			}
		},
		
		/**
		 * Обратный вызов флеша
		 * 
		 * @id - 
		 * @result - 
		 * 
		 */
		callbackFlash: function(id, result, error) {
			if (this.variable.debug) {
				console.log("Proxy: Вызываем обратный вызов флеша для ИД = " + id + " с результатом: " + result);
			}
			if (result && (typeof result !== "string")) {
				result = JSON.stringify(result);
				if (this.variable.debug) {
					console.log("Proxy: Вызываем обратный вызов флеша для ИД = " + id + " с преобразованным результатом: " + result);
				}
			}
			if (error && (typeof error !== "string")) {
				error = JSON.stringify(error);
				if (this.variable.debug) {
					console.log("Proxy: Вызываем обратный вызов флеша для ИД = " + id + " с преобразованной ошибкой: " + error);
				}
			}
			if (!result && !error) {
				this.variable.error = {code: 501, message: "Отсутствуют передаваемые результаты"};
				throw new Error(this.variable.error.message);
			}
			if (!this.variable.gameFlash) {
				this.variable.error = {code: 501, message: "Flash еще не активирована"};
				throw new Error(this.variable.error.message);
			}
			if (this.variable.gameFlash == -1) {
				this.variable.error = {code: 501, message: "На странице отсутствует флеш"};
				throw new Error(this.variable.error.message);
			}
			if (!this.variable.gameFlash.callback) {
				this.variable.error = {code: 501, message: "Устаревшая флеш не поддерживает обратный вызов"};
				throw new Error(this.variable.error.message);
			}
			this.variable.gameFlash.callback(id, result || error);
		},
		
		/**
		 * Проверка перед вызовом прокси-методов
		 */
		check: function() {
			if (! this.variable.available) {
				this.variable.error =  {code: 408, message: ERROR_SERVICE_ACCESS};
				throw new Error(this.variable.error.message);
			}
			if (! this.variable.auth) {
				this.variable.error =  {code: 401, message: ERROR_SERVICE_UNAUTHORIZED};
				throw new Error(this.variable.error.message);
			}
		},
		
		checkCallBack: function(callbackType, callback) {
			var cbm = {};
			var r = undefined;
			
			if (!callbackType || callbackType.toUpperCase() === CALL_BACK_TYPE.pipe) {
				cbm.type = CALL_BACK_TYPE.pipe;
			} else if (callbackType.toUpperCase() === CALL_BACK_TYPE.flash) {
				cbm.type = CALL_BACK_TYPE.flash;
				r = this.callbackFlash;
			} else if (callbackType.toUpperCase() === CALL_BACK_TYPE.fn) {
				cbm.type = CALL_BACK_TYPE.fn;
				r = callback;
			} else {
				throw new Error("Не смогли определить тип ответа " + callbackType);
			}
			
			var t = this;
			cbm.reply = function(id, args, answer) {
				if (cbm.type === CALL_BACK_TYPE.pipe) {
					if (answer && answer instanceof Function) {
						if (t.variable.debug) {
							console.log("Proxy: Вызываем сервисный метод " + id + " с параметрами: " + JSON.stringify(args));
						}
						return answer.apply(t.variable.env.serviceImpl, args);
					} else {
						return answer;
					}
				} else if (cbm.type === CALL_BACK_TYPE.flash) {
					
				} else if (cbm.type === CALL_BACK_TYPE.fn) {
					
				}
				
				if (answer && answer instanceof Function) {
					args.push(function(response, error) {
						if (!error && cbm.before instanceof Function) {
							cbm.before(response);
						}
						r.apply(t, [id, response, error]);
					});
					if (t.variable.debug) {
						console.log("Proxy: Вызываем сервисный метод " + id + " с параметрами: " + JSON.stringify(args));
					}
					answer.apply(t.variable.env.serviceImpl, args);
				} else {
					r.apply(t, [id, answer]);
				}
				
				return true;
			};
			
			return cbm;
		},
		
		/**
		 * Поддержание жизни сессии на сервере
		 */
		keepAlive: function() {
			var t = this;
			var keepAliveJobId = setInterval(function() {
				//Будем спрашивать список продуктов
				t.getListPaymentSystems(CALL_BACK_TYPE.fn, function(id, r, err) {
					if (err && !main.utils.isEmptyObject(err)) {
						console.log("Proxy: Процесс 'keepAlive' с ИД: " + keepAliveJobId + " остановлен по причине " + id + ", " + r + ", " + err);
						clearInterval(keepAliveJobId);
					}
				});
			} , 15*60*1000); // Каждые 15 минут
			if (this.variable.debug) {
				console.log("Proxy: Запущен процесс 'keepAlive' с ИД: " + keepAliveJobId);
			}
		},

		//~ Proxy methods -----------------------------------------------------------------------------------
		/**
		 * Логирование сообщения
		 * 
		 * @param message - Сообщение отправляемое в логгер
		 */
		log: function(message) {
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
		},
		
		/**
		 * Получить возможную причину отказа запуска Прокси
		 */
		getErrorMessage: function(callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван getErrorMessage");
			}
			var cbt = this.checkCallBack(callbackType, callback);
			
			var result = undefined;
			if (this.variable.error && this.variable.error.message) {
				result = this.variable.error.message;
			}
			if (this.error) {
				result = this.variable.error.toString();
			}
			return cbt.reply("getErrorMessage", [], result);
		},
		
		isAvailable: function(callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван isAvailable");
			}
			var cbt = this.checkCallBack(callbackType, callback);
			
			var result = this.variable.available;
			
			return cbt.reply("isAvailable", [], result);
		},
		
		isSynchronizedTime: function(callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван isSynchronizedTime");
			}
			
			var ajaxSettings = {
					url : this.variable.env.timeURL,
					type : 'POST',
					dataType: "json",
					async: false,
					crossDomain: true
					
			};
			var compareTime = function(data) {
				var client = Math.round((new Date()).getTime() / 1000); 
				var server = data.realTime;
				if (Math.abs(server - client) < 60 * 30) {
					return true;
				} else {
					return false;
				}
				
			};
			
			var cbt = this.checkCallBack(callbackType, callback);
			return cbt.reply("isSynchronizedTime", [], function(callback) {
				if (!callback) {
					ajaxSettings.async = false;
				}
				var req = $.ajax(ajaxSettings);
				if (callback) {
					req.done(function(data, textStatus, jqXHR) {
						callback.apply(this, [compareTime(data)]);
					}).fail(function(jqXHR, textStatus, errorThrown) {
						callback.apply(this, [true]);
					});
					return true;
				} else {
					return compareTime(req.responseJSON);
				}
			});
		},
		
		isOwnLand: function(callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван isOwnLand");
			}
			if (! this.variable.available) {
				this.variable.error =  {code: 408, message: ERROR_SERVICE_ACCESS};
				throw new Error(this.variable.error.message);
			}
			var cbt = this.checkCallBack(callbackType, callback);
			
			if (this.variable.env.serviceImpl.isOwnLand instanceof Function) {
				return cbt.reply("isOwnLand", [], this.variable.env.serviceImpl.isOwnLand);
			} else {
				this.variable.error = {code: 501, message: "Метод isOwnLand не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		loginPage: function (accept, cancel, register, errors) {
			var args = Array.prototype.slice.call(arguments, 0);
			args.push(this);
			if (this.variable.debug) {
				console.log("Proxy: Вызываем loginPage с параметрами: " + JSON.stringify(arguments));
			}
			if (args.length != 5) {
				throw new Error("Proxy: Не верное количество параметров");
			}
			if (!accept || ! accept instanceof Function) {
				console.log(accept);
				throw new Error("Proxy: Не опрделена функция выполнения accept");
			}
			if (!cancel || ! cancel instanceof Function) {
				console.log(cancel);
				throw new Error("Proxy: Не опрделена функция выполнения cancel");
			}
			if (!register || ! register instanceof Function) {
				console.log(register);
				throw new Error("Proxy: Не опрделена функция выполнения register");
			}
			if (errors) {
				if (typeof errors === "string") {
					throw new Error("Proxy: Не верный формат объекта errors");
				}
			}
			
			if (! this.variable.available) {
				this.variable.error =  {code: 408, message: ERROR_SERVICE_ACCESS};
				cancel.call(this, this.variable.error);
			}
			
			if (this.variable.env.serviceImpl.loginPage instanceof Function) {
				return this.variable.env.serviceImpl.loginPage.apply(this.variable.env.serviceImpl, args);
			} else {
				this.variable.error = {code: 501, message: "Метод loginPage не поддерживается"};
				cancel.call(this, this.variable.error);
			}
		},

		authentication: function (username, password, callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван authentication с параметрами: " + JSON.stringify(arguments));
			}
			if (! this.variable.available) {
				this.variable.error =  {code: 408, message: ERROR_SERVICE_ACCESS};
				throw new Error(this.variable.error.message);
			}
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [username, password];
			
			if (this.variable.auth) { 
				return cbt.reply("authentication", args, STATUS_CODE_OK);
			}
			if (this.variable.env.serviceImpl.authentication instanceof Function) {
				return cbt.reply("authentication", args, this.variable.env.serviceImpl.authentication);
			} else {
				this.variable.error = {code: 501, message: "Метод authentication не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		singupPage: function (accept, cancel, auth, errors) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван singupPage с параметрами: " + JSON.stringify(arguments));
			}
			
			var args = Array.prototype.slice.call(arguments, 0);
			args.push(this);
			if (args.length != 5) {
				throw new Error("Proxy: Не верное количество параметров");
			}
			if (!accept || ! accept instanceof Function) {
				console.log(accept);
				throw new Error("Proxy: Не опрделена функция выполнения accept");
			}
			if (!cancel || ! cancel instanceof Function) {
				console.log(cancel);
				throw new Error("Proxy: Не опрделена функция выполнения cancel");
			}
			if (!auth || ! auth instanceof Function) {
				console.log(auth);
				throw new Error("Proxy: Не опрделена функция выполнения register");
			}
			if (errors) {
				if (typeof errors === "string") {
					throw new Error("Proxy: Не верный формат объекта errors");
				}
			}
			
			if (! this.variable.available) {
				this.variable.error =  {code: 408, message: ERROR_SERVICE_ACCESS};
				cancel.call(this, this.variable.error);
			}
			
			if (this.variable.env.serviceImpl.singupPage instanceof Function) {
				if (this.variable.debug) {
					console.log("Proxy: Вызыван singupPage с параметрами: " + JSON.stringify(args));
				}
				return this.variable.env.serviceImpl.singupPage.apply(this.variable.env.serviceImpl, args);
			} else {
				this.variable.error = {code: 501, message: "Метод singupPage не поддерживается"};
				cancel.call(this, this.variable.error);
			}
		},
		
		isFreeLogin: function (login, callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван isFreeLogin с параметрами: " + JSON.stringify(arguments));
			}
			if (! this.variable.available) {
				this.variable.error =  {code: 408, message: ERROR_SERVICE_ACCESS};
				throw new Error(this.variable.error.message);
			}
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [login];
			
			if (this.variable.env.serviceImpl.isFreeLogin instanceof Function) {
				var result = cbt.reply("isFreeLogin", args, this.variable.env.serviceImpl.isFreeLogin);
				return result;
			} else {
				this.variable.error = {code: 501, message: "Метод isFreeLogin не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		register: function (profile, callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван register с параметрами: " + JSON.stringify(arguments));
			}
			if (! this.variable.available) {
				this.variable.error =  {code: 408, message: ERROR_SERVICE_ACCESS};
				throw new Error(this.variable.error.message);
			}
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [profile];
			
			if (this.variable.auth) { 
				return cbt.reply("register", args, STATUS_CODE_OK); 
			}
			if (this.variable.env.serviceImpl.register instanceof Function) {
				var result = cbt.reply("register", args, this.variable.env.serviceImpl.register);
				this.variable.profile = JSON.parse(result);
				return result;
			} else {
				this.variable.error = {code: 501, message: "Метод register не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		getProfile: function (callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван getProfile с параметрами: " + JSON.stringify(arguments));
			}
			if (! this.variable.available) {
				this.variable.error =  {code: 408, message: ERROR_SERVICE_ACCESS};
				throw new Error(this.variable.error.message);
			}
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [];
			
			if (this.variable.auth && !main.utils.isEmptyObject(this.variable.profile)) { 
				return cbt.reply("getProfile", args, JSON.stringify(this.variable.profile));
			}
			if (this.variable.env.serviceImpl.getProfile instanceof Function) {
				var t = this;
				cbt.before = function(result){
					t.variable.profile = result;
				};
				return cbt.reply("getProfile", args, this.variable.env.serviceImpl.getProfile);
			} else {
				this.variable.error = {code: 501, message: "Метод getProfile не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		getProfileAvatar: function (callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван getProfileAvatar с параметрами: " + JSON.stringify(arguments));
			}
			
			this.check();
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [];
			
			var r = undefined;
			if (this.variable.profile.avatarURL) {
				r = this.variable.serviceURL + this.variable.profile.avatarURL;
			} else {
				r = window.location.protocol + "//beta.arcasha.ru/images/avatar/camera_b.png";
			}
			return cbt.reply("getProfileAvatar", args, this.variable.env.serviceImpl.payout);
		},
		
		saveProfile: function (profileORJson, callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван saveProfile с параметрами: " + JSON.stringify(arguments));
			}
			
			this.check();
			var cbt = this.checkCallBack(callbackType, callback);
			if (typeof profileORJson === "string") { 
				profileORJson = JSON.parse(profileORJson);
			}
			var args = [profileORJson];
			
			if (this.variable.env.serviceImpl.saveProfile instanceof Function) {
				cbt.beforeReturn = function(result){this.variable.profile = JSON.parse(result);};
				return cbt.reply("saveProfile", args, this.variable.env.serviceImpl.saveProfile);
			} else {
				this.variable.error = {code: 501, message: "Метод saveProfile не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		changePassword: function (passwordOld, passwordNew, callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван changePassword с параметрами: " + JSON.stringify(arguments));
			}
			
			this.check();
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [passwordOld, passwordNew];
			
			if (this.variable.env.serviceImpl.changePassword instanceof Function) {
				var result = cbt.reply("changePassword", args, this.variable.env.serviceImpl.changePassword);
				return result;
			} else {
				this.variable.error = {code: 501, message: "Метод changePassword не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		requestRecoveryProfile: function (login, callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван requestRecoveryProfile с параметрами: " + JSON.stringify(arguments));
			}
			if (! this.variable.available) {
				this.variable.error =  {code: 408, message: ERROR_SERVICE_ACCESS};
				throw new Error(this.variable.error.message);
			}
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [login];
			
			if (this.variable.env.serviceImpl.requestRecoveryProfile instanceof Function) {
				var result = cbt.reply("requestRecoveryProfile", args, this.variable.env.serviceImpl.requestRecoveryProfile);
				return result;
			} else {
				this.variable.error = {code: 501, message: "Метод requestRecoveryProfile не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		startGame: function (typeGame, callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван startGame с параметрами: " + JSON.stringify(args));
			}
			
			this.check();
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [this.variable.gameId, typeGame];
			
			if (cbt.type === CALL_BACK_TYPE.pipe) {
				//throw new Error("Proxy: Не поддреживается данный тип ответа");
			}
			
			if (this.variable.env.serviceImpl.startGame instanceof Function) {
				if (this.variable.debug) {
					console.log("Proxy: Вызываем сервисный метод startGame с параметрами: " + JSON.stringify(args));
				}
				return cbt.reply("startGame", args, this.variable.env.serviceImpl.startGame);
			} else {
				this.variable.error = {code: 501, message: "Метод startGame не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},

		endGame: function (message, callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван endGame с параметрами: " + JSON.stringify(arguments));
			}
			
			this.check();
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [message];
			
			if (this.variable.env.serviceImpl.endGame instanceof Function) {
				return cbt.reply("endGame", args, this.variable.env.serviceImpl.endGame);
			} else {
				this.variable.error = {code: 501, message: "Метод endGame не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		getBalance: function (callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван getBalance с параметрами: " + JSON.stringify(arguments));
			}
			
			this.check();
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [];
			
			if (this.variable.env.serviceImpl.getBalance instanceof Function) {
				return cbt.reply("getBalance", args, this.variable.env.serviceImpl.getBalance);
			} else {
				this.variable.error = {code: 501, message: "Метод getBalance не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},

		getStatistics: function (typeGame, callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван getStatistics с параметрами: " + JSON.stringify(arguments));
			}
			
			this.check();
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [this.variable.gameId, typeGame];
			
			if (this.variable.env.serviceImpl.getStatistics instanceof Function) {
				return cbt.reply("getStatistics", args, this.variable.env.serviceImpl.getStatistics);
			} else {
				this.variable.error = {code: 501, message: "Метод getStatistics не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		getStatisticsFriendly: function (typeGame, callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван getStatisticsFriendly с параметрами: " + JSON.stringify(arguments));
			}
			
			this.check();
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [this.variable.gameId, typeGame];
			
			if (this.variable.env.serviceImpl.getStatisticsFriendly instanceof Function) {
				return cbt.reply("getStatisticsFriendly", args, this.variable.env.serviceImpl.getStatisticsFriendly);
			} else {
				this.variable.error = {code: 501, message: "Метод getStatisticsFriendly не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		getStatisticsPublic: function (gameId, callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван getStatisticsPublic с параметрами: " + JSON.stringify(arguments));
			}
			
			if (! this.variable.available) {
				this.variable.error =  {code: 408, message: ERROR_SERVICE_ACCESS};
				throw new Error(this.variable.error.message);
			}
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [gameId];
			
			if (this.variable.env.serviceImpl.getStatisticsPublic instanceof Function) {
				return cbt.reply("getStatisticsPublic", args, this.variable.env.serviceImpl.getStatisticsPublic);
			} else {
				this.variable.error = {code: 501, message: "Метод getStatisticsPublic не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},

		getRecord: function (gameMode, callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван getRecord с параметрами: " + JSON.stringify(arguments));
			}
			
			this.check();
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [this.variable.gameId, gameMode];
			
			if (this.variable.env.serviceImpl.getRecord instanceof Function) {
				return cbt.reply("getRecord", args, this.variable.env.serviceImpl.getRecord);
			} else {
				this.variable.error = {code: 501, message: "Метод getRecord не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		getListProducts: function (callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван getListProducts с параметрами: " + JSON.stringify(arguments));
			}
			
			if (! this.variable.available) {
				this.variable.error =  {code: 408, message: ERROR_SERVICE_ACCESS};
				throw new Error(this.variable.error.message);
			}
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [];
			
			if (this.variable.env.serviceImpl.getListProducts instanceof Function) {
				return cbt.reply("getListProducts", args, this.variable.env.serviceImpl.getListProducts);
			} else {
				this.variable.error = {code: 501, message: "Метод getListProducts не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		buy: function (product, callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван buy с параметрами: " + JSON.stringify(arguments));
			}
			
			this.check();
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [product];
			
			if (this.variable.env.serviceImpl.buy instanceof Function) {
				return cbt.reply("buy", args, this.variable.env.serviceImpl.buy);
			} else {
				this.variable.error = {code: 501, message: "Метод buy не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		/**
		 * Получить список платежных систем
		 * 
		 * @return List<PaymentSystem>
		 */
		getListPaymentSystems: function (callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван getListPaymentSystems с параметрами: " + JSON.stringify(arguments));
			}
			
			if (! this.variable.available) {
				this.variable.error =  {code: 408, message: ERROR_SERVICE_ACCESS};
				throw new Error(this.variable.error.message);
			}
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [];
			
			if (this.variable.env.serviceImpl.getListPaymentSystems instanceof Function) {
				if (this.variable.debug) {
					console.log("Proxy: Вызываем сервисный метод getListPaymentSystems с параметрами: " + JSON.stringify(arguments));
				}
				return cbt.reply("getListPaymentSystems", args, this.variable.env.serviceImpl.getListPaymentSystems);
			} else {
				this.variable.error = {code: 501, message: "Метод getListPaymentSystems не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		/**
		 * Получить список тем обращений в техподдержку
		 * 
		 * @return List<PaymentSystem>
		 */
		getListSupportSubjects: function (callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван getListSupportSubjects с параметрами: " + JSON.stringify(arguments));
			}
			
			if (! this.variable.available) {
				this.variable.error =  {code: 408, message: ERROR_SERVICE_ACCESS};
				throw new Error(this.variable.error.message);
			}
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [];
			
			if (this.variable.env.serviceImpl.getListSupportSubjects instanceof Function) {
				if (this.variable.debug) {
					console.log("Proxy: Вызываем сервисный метод getListSupportSubjects с параметрами: " + JSON.stringify(arguments));
				}
				return cbt.reply("getListSupportSubjects", args, this.variable.env.serviceImpl.getListSupportSubjects);
			} else {
				this.variable.error = {code: 501, message: "Метод getListSupportSubjects не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		/**
		 * Отправить сообщение в техподдержку
		 * 
		 * @return Номер
		 */
		contactSupport: function (message, callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван contactSupport с параметрами: " + JSON.stringify(arguments));
			}
			
			if (! this.variable.available) {
				this.variable.error =  {code: 408, message: ERROR_SERVICE_ACCESS};
				throw new Error(this.variable.error.message);
			}
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [message];
			
			if (this.variable.env.serviceImpl.contactSupport instanceof Function) {
				return cbt.reply("contactSupport", args, this.variable.env.serviceImpl.contactSupport);
			} else {
				this.variable.error = {code: 501, message: "Метод contactSupport не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		/**
		 *  Создать запрос перевода средств
		 *  
		 *  @param paymentSystemCode
		 *  @param depositReceiver
		 *  @param amount
		 *  
		 *  @return status
		 */
		payout: function (paymentSystemCodeORJson, depositReceiver, amount, callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван payout с параметрами: " + JSON.stringify(arguments));
			}
			
			this.check();
			var cbt = undefined;
			var args = [];
			if ((arguments.length <= 3) && (typeof arguments[0] === "string")) {
				cbt = this.checkCallBack(arguments[1], arguments[2]);
				args.push(JSON.parse(arguments[0]));
			} else if (arguments.length == 4 || arguments.length == 5) {
				cbt = this.checkCallBack(arguments[3], arguments[4]);
				args.push({paymentSystemCode: arguments[0], depositReceiver: arguments[1], amount: arguments[2]});
			} else {
				throw new Error("Proxy: Не верное количество параметров");
			}
			
			if (cbt.type === CALL_BACK_TYPE.pipe) {
				throw new Error("Proxy: Не поддреживается данный тип ответа");
			}
			
			if (this.variable.env.serviceImpl.payout instanceof Function) {
				if (this.variable.debug) {
					console.log("Proxy: Вызываем сервисный метод payout с параметрами: " + JSON.stringify(args));
				}
				return cbt.reply("payout", args, this.variable.env.serviceImpl.payout);
			} else {
				this.variable.error = {code: 501, message: "Метод payout не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		/**
		 * Опубликовать новый рекорд
		 * 
		 * @return
		 */
		shareNewRecord: function (record, callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван shareNewRecord с параметрами: " + JSON.stringify(arguments));
			}
			
			this.check();
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [record];
			
			if (this.variable.env.serviceImpl.shareNewRecord instanceof Function) {
				if (this.variable.debug) {
					console.log("Proxy: Вызываем сервисный метод shareNewRecord с параметрами: " + JSON.stringify(arguments));
				}
				return cbt.reply("shareNewRecord", args, this.variable.env.serviceImpl.shareNewRecord);
			} else {
				this.variable.error = {code: 501, message: "Метод shareNewRecord не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		/**
		 * Опубликовать заработанный деньги
		 * 
		 * @return
		 */
		shareIncomeMoney: function (money, callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван shareIncomeMoney с параметрами: " + JSON.stringify(arguments));
			}
			
			this.check();
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [money];
			
			if (this.variable.env.serviceImpl.shareIncomeMoney instanceof Function) {
				if (this.variable.debug) {
					console.log("Proxy: Вызываем сервисный метод shareIncomeMoney с параметрами: " + JSON.stringify(arguments));
				}
				return cbt.reply("shareIncomeMoney", args, this.variable.env.serviceImpl.shareIncomeMoney);
			} else {
				this.variable.error = {code: 501, message: "Метод shareIncomeMoney не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		},
		
		/**
		 * Пригласить друзей
		 * 
		 * @return 
		 */
		inviteFriends: function (callbackType, callback) {
			if (this.variable.debug) {
				console.log("Proxy: Вызыван inviteFriends с параметрами: " + JSON.stringify(arguments));
			}
			
			this.check();
			var cbt = this.checkCallBack(callbackType, callback);
			var args = [];
			
			if (this.variable.env.serviceImpl.inviteFriends instanceof Function) {
				if (this.variable.debug) {
					console.log("Proxy: Вызываем сервисный метод inviteFriends с параметрами: " + JSON.stringify(arguments));
				}
				return cbt.reply("inviteFriends", args, this.variable.env.serviceImpl.inviteFriends);
			} else {
				this.variable.error = {code: 501, message: "Метод inviteFriends не поддерживается"};
				throw new Error(this.variable.error.message);
			}
		}
}

//-----------------~ Boot ~----------------------------------------------------------------------------------
//Загружаем объект
try {
	if (!arcasha) var arcasha = new ArcashaProxy();
} catch (e) {
	console.log(e.message);
	alert("Сообщите тех. поддержке, что '" + e.message + "'");
	console.log(e.stack);
}

//-----------------~ Wrapper proxy ~-------------------------------------------------------------------------
/**
 * Синхронизированное ли время у игрока
 */
function arcashaIsSynchronizedTime () {
	return arcasha.isSynchronizedTime.apply(arcasha, arguments);
};

/**
 * Логирование сообщения
 */
function arcashaLog () {
	return arcasha.log.apply(arcasha, arguments);
};

/**
 * Получить возможную причину отказа запуска приложения
 */
function arcashaGetErrorMessage () {
	return arcasha.getErrorMessage.apply(arcasha, arguments);
};

/**
 * Находимся на своем сайте
 */
function arcashaIsOwnLand () {
	return arcasha.isOwnLand.apply(arcasha, arguments);
};

/**
 * Начало игры
 */
function arcashaStartGame () {
	return arcasha.startGame.apply(arcasha, arguments);
};

/**
 *  Конец игры
 */
function arcashaEndGame () {
	return arcasha.endGame.apply(arcasha, arguments);
};

/**
 * Получить профиль игрока
 */
function arcashaGetProfile () {
	return arcasha.getProfile.apply(arcasha, arguments);
};

/**
 * Получить автарку игрока
 */
function arcashaGetProfileAvatar () {
	return arcasha.getProfileAvatar.apply(arcasha, arguments);
};

/**
 * Обновить профиль игрока
 */
function arcashaSaveProfile () {
	return arcasha.saveProfile.apply(arcasha, arguments);
};

/**
 * Текущий баланс пользователя
 */
function arcashaGetBalance () {
	return arcasha.getBalance.apply(arcasha, arguments);
};

/**
 * Статистика в виде топ-10 с текущим игроком
 */
function arcashaGetStatistics () {
	return arcasha.getStatistics.apply(arcasha, arguments);
};

/**
 * Статистика игрока с его друзьями
 */
function arcashaGetStatisticsFriendly () {
	return arcasha.getStatisticsFriendly.apply(arcasha, arguments);
};

/**
 * Рекорд текущего игрока
 */
function arcashaGetRecord () {
	return arcasha.getRecord.apply(arcasha, arguments);
}; 

/**
 * Получить список продаваемых продуктов
 */
function arcashaListProducts () {
	return arcasha.getListProducts.apply(arcasha, arguments);
}; 

/**
 * Произвести покупку
 */
function arcashaBuy () {
	return arcasha.buy.apply(arcasha, arguments);
}; 

/**
 * Получить список платежных систем
 */
function arcashaListPaymentSystems () {
	return arcasha.getListPaymentSystems.apply(arcasha, arguments);
}; 

/**
 *  Создать запрос перевода средств
 */
function arcashaPayout () {
	return arcasha.payout.apply(arcasha, arguments);
}; 

/**
 *  Опубликовать новый рекорд
 */
function arcashaShareNewRecord () {
	return arcasha.shareNewRecord.apply(arcasha, arguments);
}; 

/**
 *  Опубликовать заработанный деньги
 */
function arcashaShareIncomeMoney () {
	return arcasha.shareIncomeMoney.apply(arcasha, arguments);
}; 

/**
 *  Пригласить друзей
 */
function arcashaInviteFriends () {
	return arcasha.inviteFriends.apply(arcasha, arguments);
}; 
