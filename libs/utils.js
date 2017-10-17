//-----------------~ Utils ~---------------------------------------------------------------------------------
if (!main) var main = {};
main.utils = {
	version: '1.2.0',
	varsionMajor: 1,
	varsionMinor: 201,
	/**
	 * Блок утилит проверок
	 * */
	checker: {
		isIE: function () {
			var myNav = navigator.userAgent.toLowerCase();
			return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
		},
		isEdge: function () {
			return /Edge/.test(navigator.userAgent);
		}, 
		isEmailFormat: function (email) {
			return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
		}
	},
	
	getHostName: function () {
		return window.location.hostname;
	},
	getSwfObjectById: function (elementId) {
		var listObject = document.getElementsByTagName("OBJECT");
		for (var int = 0; int < listObject.length; int++) {
			if (listObject[int].id === elementId) {
				return listObject[int];
			}
		}
	},
	createClass: function() {
		return function() {
			this.initialize.apply(this, arguments);
		};
	},
	copyProperty: function (source, target) {
		for (var attrname in source) { 
			target[attrname] = source[attrname]; 
		}
		return target;
	},
	mergeProperty: function (obj1, obj2) {
		var obj3 = {};
	    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
	    for (var attrname in obj2) {
	    	if (!obj3[attrname] || !(obj3[attrname] instanceof Object)) {
	    		obj3[attrname] = obj2[attrname];
	    	} else if (obj3[attrname] instanceof Object) {
	    		if (obj2[attrname] instanceof Object) {
	    			obj3[attrname] = main.utils.mergeProperty(obj3[attrname], obj2[attrname]);
	    		} else if (obj2[attrname]) {
	    			obj3[attrname] = obj2[attrname];
	    		}
	    	}
	    }
	    return obj3;
	},
	/**
	 * Чистим объект от пустых полей
	 * 
	 * @param restrict - Строгая чистка, 0 и пустая строка считаются пустыми полями
	 * @returns Входной объект
	 */
	clearEmptyProperty: function (obj, recursive, restrict) {
		for (var pr in obj) {
			if (typeof obj[pr] === "object") {
				if (recursive) {
					main.utils.clearEmptyProperty(obj[pr], recursive, restrict);
				}
				if (main.utils.isEmptyObject(obj[pr])) {
					delete obj[pr];
				}
			} else {
				if ((restrict && (obj[pr] == 0 || obj[pr] == "" || main.utils.isEmpty(obj[pr]))) || main.utils.isEmpty(obj[pr]) ) {
					delete obj[pr];
				}
			}
		}
		return obj;
	},
	isEmpty: function(obj) {
		if (!obj) {
			return true;
		}
		if ((obj == null) || (obj == undefined)) {
			return true;
		}
	},
	isEmptyObject: function(obj) {
		return Object.keys(obj).length === 0 && JSON.stringify(obj) === JSON.stringify({});
	},
	isEmptyString: function(str) {
		if (! str) return true;
		if (str.trim().length == 0) return true;
		return false;
	},
	isInIframe: function() {
		//var t1 = window.frames[0].parent === window; // Можно еще так попробывать
		try {
	        return window.self !== window.top;
	    } catch (e) {
	        return true;
	    }
	},
	isNumber: function(n) {
		return !isNaN(parseFloat(n)) && isFinite(n);
	},
	/**
	 * Проверяет переменную на тип Array
	 * @param inputArray
	 * @returns {Boolean}
	 */
	isArray: function (inputArray) {
		return inputArray && !(inputArray.propertyIsEnumerable('length')) && typeof inputArray === 'object' && typeof inputArray.length === 'number';
	},
	
	loadScript: function (url, context, callback, callbackError) {
		// Adding the script tag to the head as suggested before
		var head = document.getElementsByTagName('head')[0];
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = url;

		// Then bind the event to the callback function.
		// There are several events for cross browser compatibility.
		if (callback) {
			var callbackAnon = function() {
				callback.apply(context);
			};
			script.onload = callbackAnon;
			//script.onreadystatechange = callbackAnon; //Непонятно для чего...
		}
		
		if (callbackError) {
			script.onerror = function() {
				callbackError.apply(context);
			};
		} else {
			script.onerror = function() {
				throw {message: 'Не удалось загрузить скрипт ' + url};
			};
		}
		
		// Fire the loading
		head.appendChild(script);
	},
	getAjaxCOSSSettings: function(s) {
		var settings = {
				crossDomain: true, 
				xhrFields: {
					withCredentials: true
				}};
		/* Данная фича перестала работать, возможно отрабатывает только для синхронных запросов
		 * if (navigator.userAgent.search("Firefox") != -1) {
			delete settings.xhrFields;
			settings.beforeSend = function(xhr) { 
				xhr.withCredentials = true; 
			};
		}*/
		if (s) {
			this.copyProperty(s, settings);
		}
		return settings;
	},
	
	/**
	 * Сформирует валидный URL
	 * 
	 * @param ссылка
	 * @returns {String}
	 */
	generateUrl: function(url) {
		if (!url) {
			return "/";
		}
		if (url.charAt(0) === '/') {
			return url;
		}
		return window.location.protocol + '//' + url;
	},
	
	/**
	 * Сформирует уникальный индификатор
	 * 
	 * @returns {String}
	 */
	generateUUID: function(len, radix) {
		  var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
				.split('');

		var chars = CHARS, uuid = [], rnd = Math.random;
		radix = radix || chars.length;

		if (len) {
			// Compact form
			for (var i = 0; i < len; i++)
				uuid[i] = chars[0 | rnd() * radix];
		} else {
			// rfc4122, version 4 form
			var r;

			// rfc4122 requires these characters
			uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
			uuid[14] = '4';

			// Fill in random data.  At i==19 set the high bits of clock sequence as
			// per rfc4122, sec. 4.1.5
			for (var i = 0; i < 36; i++) {
				if (!uuid[i]) {
					r = 0 | rnd() * 16;
					uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r & 0xf];
				}
			}
		}

		return uuid.join('');
	}, 
	convert: {
			convertStringToDate: function(str) { // Пример входа: 17.10.2017 0:17:07, 2018-01-16T21:27:07.000Z
				var strDate = "03.09.1979";
				var dateParts = strDate.split(".");
				var date = new Date(dateParts[2], (dateParts[1] - 1), dateParts[0]);
				return str;
			},
			
			convertDateToUnix: function(date) {
				if (date)
					return new Date(date).getTime();
				else 
					return "";
			},

			convertUnixToDateYYYMMDD: function(unix_timestamp) {
				if (unix_timestamp){
					var date = new Date(parseInt(unix_timestamp));
					var y = date.getFullYear();
					var m = "0" + (parseInt(date.getMonth()) + 1);
					var d = "0" + date.getDate();
					return y+"-"+m.substr(-2)+"-"+d.substr(-2);
				} else 
					return "";
			},

			convertUnixToDateDDMMYYYY: function(unix_timestamp) {
				if (unix_timestamp){
					var date = new Date(parseInt(unix_timestamp));
					var y = date.getFullYear();
					var m = "0" + (parseInt(date.getMonth()) + 1);
					var d = "0" + date.getDate();
					return d.substr(-2)+"."+m.substr(-2)+"."+y;
				} else 
					return "";
			},

			convertUnixToFullDate: function(unix_timestamp) {
				if (unix_timestamp){
					var date = new Date(parseInt(unix_timestamp));
					var y = date.getFullYear();
					var m = "0" + (parseInt(date.getMonth()) + 1);
					var d = "0" + date.getDate();
					var h = "0" + date.getHours();
					var mm = "0" + date.getMinutes();
					var s = "0" + date.getSeconds();
					return d.substr(-2) + "." + m.substr(-2) + "." + y + " " + h.substr(-2) + ":" + mm.substr(-2);
				} else 
					return "";
			},
			
			convertDate: function(date) {
				switch (navigator.appName) {
					case "Microsoft Internet Explorer":
						return date.getVarDate();
					default:
						return date;
				}
			}
	}, 
	uploadContent: function(paramsIn) {
		// исходные коды позаинствованы с 
		// http://stackoverflow.com/questions/2198470/javascript-uploading-a-file-without-a-file
		var boundary = main.utils.generateUUID(12);

		/* Переопределяем параметры по умолчанию */
		var params = main.utils.mergeProperty({
			file: {
				type : 'text/plain',
				filename : 'file.dat',
				content : undefined // File content goes here
			},
			url: undefined,
			overwrite : 'true',
			destination : 'datafile',
			callback: undefined
		}, paramsIn);
		
		if (! params.file.content) {
			throw new Error("Не возможно отправить пустой файл");
		}
		
		// TODO Нужно сделать проверку поддержки var fd = new FormData();  и сделать через этот объект

		var content = [];
		// (->) start push content 
		content.push('--' + boundary);
		var mimeHeader = 'Content-Disposition: form-data; name="' + params.destination + '"; ';
		mimeHeader += 'filename="' + params.file.filename + '";';
		content.push(mimeHeader);
		content.push('Content-Type: ' + params.file.type);
		content.push('');
		content.push(params.file.content);
		content.push('--' + boundary + '--');
		// end push content (<-)

		/* it should still work if you can control headers and POST raw data */
		$.ajax({
		    url: params.url,
		    data: content.join('\r\n'),
		    processData: false,
		    contentType: false,
		    type: 'POST',
		    headers : {
				'Content-Type' : 'multipart/form-data; boundary=' + boundary
				//'Content-Length' : content.length
			},
		    success: function () {
		    	if (params.callback && params.callback instanceof Function) {
		    		params.callback();
		    	}
		    },
		    error: function (error) {
		        if (params.callback && params.callback instanceof Function) {
		        	params.callback({error: {status: error.status, message: error.statusText}});
		    	}
		    }
		});
	},
	cookie: {
		get: function(name) {
			var matches = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"));
			return matches ? decodeURIComponent(matches[1]) : undefined;
		},
		put: function(name, value, expires, path) {
			var value = encodeURIComponent(value);
			var updatedCookie = name + "=" + value;
			
			if (typeof expires == "number" && expires) {
				var d = new Date();
				d.setTime(d.getTime() + expires * 1000);
				expires = d;
			}
			if (expires && expires.toUTCString) {
				updatedCookie += "; expires=" + expires.toUTCString();
			}
			if (path) {
				updatedCookie += "; path=" + path;
			} else {
				updatedCookie += "; path=/";
			}

			document.cookie = updatedCookie;
		}
	},
	ui: {
		writeSelectOptionRestrict: function (el, data) {
			var el = el;
			if (! el instanceof jQuery) {
				el = $(el);
			}
			if (el.length == 0) {
				throw new Error("Элемент не найден " + el);
			}
			el.html("");
			if (main.utils.isEmptyObject(data) || data.length == 0) {
				setValSelected(el, "Нет данных");
				return;
			}
			var option_tmpl = '<option value="$value">$name</option>';
			var opValue, opName;
			for (var key in data) {
				opValue = key; opName = data[key];
				if (jQuery) {
					if (jQuery.isNumeric(opValue) && (typeof opName == "object")) {
						opValue = opName.code;
						opName = opName.name;
					}
				} else {
					if (main.utils.isNumber(opValue) && (typeof opName == "object")) {
						opValue = opName.code;
						opName = opName.name;
					}
				}
				var $newLine = $(option_tmpl.replaceAll("$value", opValue).replaceAll("$name", opName));
				el.append($newLine);
			}
		},
		writeSelectOption: function (el, data) {
			var el = el;
			if (! el instanceof jQuery) {
				el = $(el);
			}
			this.writeSelectOptionRestrict(el, data);
			el.prepend('<option value="">Выберите...</option>');
		},
		
		/**
		 * Set option in select with text as in param val
		 * @param el - Jquery object or element's selector 
		 * @param val - String
		 * 
		 * @author Goncharov Nikita
		 */
		setValSelected: function(el, val) {
			if (!val || val.isBlank()) return;
			
			var el = el;
			if (! el instanceof jQuery) {
				el = $(el);
			}
			var $opt = $('option', el).filter(function() {
				//may want to use $.trim in here
				return $(this).text().trim() == val.trim(); 
			});
			if ($opt.length > 0) {
				$opt.attr('selected', true);
			} else {
				el.append('<option disabled="disabled" selected="selected" value="'+val+'">'+val+'</option>');
			}
			
		},

		/**
		 * Clear list option in select
		 * @param el - Jquery object or element's selector 
		 * 
		 * @author Goncharov Nikita
		 */
		clearSelected: function(el) {
			var el = el;
			if (! el instanceof jQuery) {
				el = $(el);
			}
			el.html("");
			el.append('<option value="">Выберите...</option>');
		},
		
		scrollToTopPage: function(callback) {
			var body = $("html, body");
			body.stop().animate({scrollTop:0}, '500', 'swing', function() { 
				if (callback instanceof Function) {
					callback();
				}
			});
		}
	}
};

//~ Extend jQuery ~------------------------------------------------------------------------------------------
if (typeof $ !== 'undefined') {

/**
 * Serialize form data to json
 * @author Goncharov Nikita
 * @param form
 * 
 * @returns Object
 */
$.fn.serializeObject = function() {
    var o = new Object();
    var a = this.serializeArray();
    
    $.each(a, function() {
    	var obj = o;
        var subname = this.name.split('.');
        //console.log("AAAA");
        //console.log(subname);
        for (var i=0; i<subname.length; i++) {
            if (i == subname.length - 1) {
            //	console.log("BBBB: " + this.value);
                 pushObject(obj, subname[i], this.value);
            } else {
            	var value = new Object();
            	if (obj[subname[i]]) value = obj[subname[i]];
                obj = pushObject(obj, subname[i], value);
            }
        }
    });
    
    function pushObject(object, name, value) {
        if (object[name] !== undefined) {
           /* if (!object[name].push) {
                object[name] = [object[name]];
            }
            object[name].push(value || '');*/
        } else {
            object[name] = value || '';
        }
        return value;
    };
    
    return o;
};

/**
 * DeSerialize json to form input
 * @author Goncharov Nikita
 * @param Object of json
 * 
 * @returns this
 */
$.fn.deSerializeObject = function(json) {
	var _this = this;
    for (key in json){
		pushInput(key, json[key]);
	}
	function pushInput(name, value, prefix) {
		if (!prefix) prefix = '';
		var key = prefix+name;
		if (value instanceof Object) {
			for (subkey in value){
				pushInput(subkey, value[subkey], key+'.');
			}
		} else {
		//	$inp = $("input[name='" + key + "'], select[name='" + key + "'], textarea[name='" + key + "']", _this);
			$inp = $("input[name='" + key + "'], select[name='" + key + "'], textarea[name='" + key + "']");
			if ($inp.length > 0) {
				$inp.val(value);
				if ($inp.hasClass("datepicker")/* && $inp.hasClass("original") && value*/){
					$inp.val(convertUnixToDateYYYMMDD(value));
					//$inp.prev().val(convertUnixToDateDDMMYYYY(value));
				}
				if ($inp.attr("type") == "checkbox")
					$inp.prop("checked", value);
			}
		}
	}
    return this;
};

/**
 * formhtml()
 * updates current value for html()
 * @author gnarf
 * http://stackoverflow.com/questions/1388893/jquery-html-in-firefox-uses-innerhtml-ignores-dom-changes
 */
$.fn.formhtml = function() {
	var oldHTML = $.fn.html;
	
    if (arguments.length) return oldHTML.apply(this,arguments);
    $("input,button", this).each(function() {
      this.setAttribute('value',this.value);
    });
    $("textarea", this).each(function() {
      // updated - thanks Raja & Dr. Fred!
      $(this).text(this.value);
    });
    $("input:radio,input:checkbox", this).each(function() {
      // im not really even sure you need to do this for "checked"
      // but what the heck, better safe than sorry
      if (this.checked) this.setAttribute('checked', 'checked');
      else this.removeAttribute('checked');
    });
    $("option", this).each(function() {
      // also not sure, but, better safe...
      if (this.selected) this.setAttribute('selected', 'selected');
      else this.removeAttribute('selected');
    });
    return oldHTML.apply(this);
};
}
//~ Конец: Extend jQuery ~-----------------------------------------------------------------------------------

//~ Расширение стандартных JS-объектов ~---------------------------------------------------------------------
/**
 * 
 * @author Goncharov Nikita
 * @param search
 * @param replace
 * 
 * @returns String
 */
String.prototype.replaceAll = function(search, replace){
	return this.split(search).join(replace);
};
