# wirone
 
Wirone - микро-фреймворк для работы с умным домом Яндекса и реализации Yandex Smarthome Adapter API. Основан на Express.js

## Возможности

- Встроенная реализация сервера OAuth авторизации
- Поддержка query и action обработчиков для умений и встроенных датчиков устройства, что избавляет от надобности формировать JSON-объект с полной информацией об устройстве:
  
  ```JavaScript
  const info = {
      name: "Чайник",
      type: "devices.types.cooking.kettle",

      capabilities: [
          OnOffCapability({
              // Функция, реализованная как Promise, которая возвращает текущее состояние умения OnOff
              onQuery: powerQuery,
              // Функция, реализованная как Promise, которая обрабатывает изменение состояния умения OnOff
              onAction: powerAction
          }),
          RangeCapability({
              parameters: {
                  instance: "temperature",
                  unit: "unit.temperature.celsius",
                  range: {
                      min: 60,
                      max: 100
                  }
              },

              // Функция, реализованная как Promise, которая возвращает текущее состояние умения Range (целевая температура воды)
              onQuery: temperatureQuery,
              // Функция, реализованная как Promise, которая обрабатывает изменение состояния умения Range
              onAction: temperatureAction
          })
      ]
  }
  ```
- Описание устройств в виде независимых модулей:

  ```JavaScript
  const OnOffCapability = require("wirone").capabilities.OnOff;
  
  const ledBulb = () => {
      const powerQuery = () => new Promise((resolve, reject) => {
          // Your awesome code
      });

      const powerAction = (state) => new Promise((resolve, reject) => {
          // Your awesome code
      });

      const info = {
          name: "Лампочка",
          type: "devices.types.light",

          capabilities: [
              OnOffCapability({
                  onQuery: powerQuery,
                  onAction: powerAction
              })
          ]
      }

      return Object.freeze({
          info
      });
  }
  
  module.exports = ledBulb();
  ```
## Быстрый старт

Для демонстрации возможностей и примеров кода был создан [репозиторий с шаблоном приложения](https://github.com/Yuukari/wirone-template).

Шаблон содержит базовую реализацию сервера, включая готовые обработчики OAuth авторизации, связь с базой данных MySQL, и описание трех устройств для умного дома.

## Инициализация Wirone

Чтобы использовать Wirone в вашем приложении, вам необходимо установить [Express.js](https://github.com/expressjs/express), а также инициализировать Wirone с определенной конфигурацией.

Пример кода для инициализации Wirone:

```JavaScript
const fs = require("fs");
const https = require("https");

const express = require("express");
const app = express();
const wirone = require("wirone");

// Объекты пользовательских устройств
const devices = {
    ledBulb: require("./src/devices/ledBulb.js"),
    switch: require("./src/devices/switch.js")
};

app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Конфигурация Wirone
wirone.init(app, {
    // Обязательные параметры помечены символом *

    // debug - включает отладочные сообщения об OAuth авторизации, запросах к устройствам и т.д.
    // По умолчанию: false
    debug: true,

    // oauth* - конфигурация OAuth авторизации
    oauth: {
        // client* - идентификатор приложения (client identifier) для реализации связки аккаунтов через OAuth
        client: "wirone",

        // secret* - секрет приложения (client password) для реализации связки аккаунтов через OAuth
        secret: "your_secret_here",

        // lifetime - время жизни токена в секундах
        // По умолчанию: 3600
        lifetime: 3600,

        // authorization_page* - объект с описанием типа используемой страницы для авторизации пользователей
        authorization_page: {
            type: "static_page",
            path: path.join(__dirname + "/static/oauth/index.html")
        },

        // Обрабочики, реализующие логику авторизации*
        onAuthorize: oauth.generateCode,
        onGranted: oauth.saveAccessToken,
        onRefresh: oauth.refreshAccessToken,
        onVerify: oauth.verifyAccessToken
    }
});

// Обработчик для передачи информации об устройствах пользовател
wirone.query((userID) => new Promise((resolve, reject) => {
    // Данная реализация обработчика является не более, чем примером для простоты понимания работы
    if (userID == 1)
        // Возвращаем устройства для пользователя с ID 1
        resolve([
            devices.ledBulb,
            devices.switch
        ]);
    else
        reject("Access denied for user with ID '" + userID + "'");
}));

https.createServer({
    key: fs.readFileSync("./static/ssl/privkey.pem"),
    ca: fs.readFileSync("./static/ssl/chain.pem"),
    cert: fs.readFileSync("./static/ssl/cert.pem")
}, app).listen(443, "0.0.0.0", 10, () => {
    console.log("> Server ready");
});
```

## Реализация обработчиков OAuth авторизации:

Для понимания работы обработчиков OAuth авторизации рекомендуется посмотреть их реализацию в [репозитории с шаблоном приложения](https://github.com/Yuukari/wirone-template/blob/main/src/oauth/oauth.js).

## Описание пользовательских устройств

Устройства в wirone представляют собой независимые модули (функциональные объекты), которые, как правило, содержат объект с информацией об устройстве и описание обработчиков, для умений и встроенных датчиков.

Объект с информацией об устройстве описывается используя [параметры из документации](https://yandex.ru/dev/dialogs/smart-home/doc/reference/get-devices.html#output-structure), а также используя объекты умений (capabilities) и встроенных датчиков (properties).

Рассмотрим пример описания умной лампочки, которая находится в локальной сети, и поддерживает управление через REST-подобное API:

```JavaScript
// Файл ledBulb.js

const request = require("request");

const OnOffCapability = require("wirone").capabilities.OnOff;

const ledBulb = () => {
    // Обработчик текущего состояния (query) для умения On_off
    const powerQuery = () => new Promise((resolve, reject) => {
        // Запрос к устройству в локальной сети
        request({
            url: "http://192.168.0.110/state",
            method: "get"
        }, (error, response, body) => {
            /*
                Представим, что в ответ устройство возвращает JSON объект вида:
                
                {
                    "power": true,
                    "color": {
                        "r": 255,
                        "g": 42,
                        "b": 14
                    }
                }
                
                Объект содержит информацию о том, включено ли устройство, а также объект с интенсивностью свечения
                оттенков красного, зеленого и синего, от 0 до 255
            */
            
            // Если в процессе запроса произошла ошибка, необходимо вызвать reject с кодом ошибки из документации
            // Подробное описание кодов ошибок находится здесь: https://yandex.ru/dev/dialogs/smart-home/doc/concepts/response-codes.html
            if (error != null)
                return reject("INTERNAL_ERROR");

            // При успешном выполнении запроса записываем полученные данные в объект состояния, который формируется
            // в соответствии с используемым умением или встроенным датчком
      
            // Пример объекта для умения On_off: https://yandex.ru/dev/dialogs/smart-home/doc/concepts/on_off.html#state__parameters
            resolve({
                instance: "on",
                value: body.power
            });
        });
    });

    // Обработчик изменения состояния (action) для умения On_off
    const powerAction = (state) => new Promise((resolve, reject) => {
        // Параметр state содержит структуру, идентичную объекту state в примере запроса изменения
        // состояния умения On_off: https://yandex.ru/dev/dialogs/smart-home/doc/concepts/on_off.html#action__example
        
        let newPowerState = state.value;

        request({
            url: "http://192.168.0.110/state",
            method: "post",
            json: {
                // Устанавливаем новое состояние устройству в локальной сети, т.е. включаем лампочку
                power: newPowerState
            }
        }, (error, response, body) => {
            if (error != null)
                return reject("INTERNAL_ERROR");

            // В случае успеха вызывается resolve с передачей объекта, который описывает результат изменения состояния умения
            // Пример объекта для умения On_off: https://yandex.ru/dev/dialogs/smart-home/doc/concepts/on_off.html#action__parameters
            resolve({
                instance: "on",
                action_result: {
                    status: "DONE"
                }
            });
        });
    });

    // Объект с информацией об устройстве
    // Может включать в себя параметры, описанные в документации: https://yandex.ru/dev/dialogs/smart-home/doc/reference/get-devices.html#output-structure
    const info = {
        // Имя устройства
        name: "Лампочка",
        
        // Тип устройства
        type: "devices.types.light",

        // Массив с описанием умений устройства
        capabilities: [
            // Описание умения On_off
            
            // При описании умений и встроенных датчиков используется объект с параметрами, приведенный в документации,
            // например: https://yandex.ru/dev/dialogs/smart-home/doc/concepts/on_off.html#discovery__parameters
            OnOffCapability({
                // Установка обработчиков для умения
                onQuery: powerQuery,
                onAction: powerAction
            })
        ]
    }

    // Устройство обязательно должно возвращать объект с информацией о нем
    return Object.freeze({
        info
    });
}

module.exports = ledBulb();
```

Можно также добавить возможность управлять цветом нашей лампочки, используя умение Color_setting:

```JavaScript
// Файл ledBulb.js

const request = require("request");

const OnOffCapability = require("wirone").capabilities.OnOff;
const ColorCapability = require("wirone").capabilities.ColorSetting;

const ledBulb = () => {
    const powerQuery = () => new Promise((resolve, reject) => {
        request({
            url: "http://192.168.0.110/state",
            method: "get"
        }, (error, response, body) => {
            if (error != null)
                return reject("INTERNAL_ERROR");

            resolve({
                instance: "on",
                value: body.power
            });
        });
    });

    const powerAction = (state) => new Promise((resolve, reject) => {
        let newPowerState = state.value;

        request({
            url: "http://192.168.0.110/state",
            method: "post",
            json: {
                power: newPowerState
            }
        }, (error, response, body) => {
            if (error != null)
                return reject("INTERNAL_ERROR");
                
            resolve({
                instance: "on",
                action_result: {
                    status: "DONE"
                }
            });
        });
    });
    
    // Обработчик текущего состояния (query) для умения Color_setting
    const colorQuery = () => new Promise((resolve, reject) => {
        request({
            url: "http://192.168.0.110/state",
            method: "get"
        }, (error, response, body) => {
            if (error != null)
                return reject("INTERNAL_ERROR");

            resolve({
                instance: "rgb",
                value: {
                    r: body.color.r,
                    g: body.color.g,
                    b: body.color.b
                }
            });
        });
    });
    
    // Обработчик изменения состояния (action) для умения Color_setting
    const colorAction = (state) => new Promise((resolve, reject) => {
        let newColorState = state.value;

        request({
            url: "http://192.168.0.110/state",
            method: "post",
            json: {
                color: newColorState
            }
        }, (error, response, body) => {
            if (error != null)
                return reject("INTERNAL_ERROR");
                
            resolve({
                instance: "rgb",
                action_result: {
                    status: "DONE"
                }
            });
        });
    });

    const info = {
        name: "Лампочка",
        type: "devices.types.light",

        capabilities: [
            OnOffCapability({
                onQuery: powerQuery,
                onAction: powerAction
            }),
            
            // Описание умения Color_setting
            ColorCapability({
                // Используем цветовую модель RGB
                parameters: {
                    color_model: "rgb"
                },

                onQuery: colorQuery,
                onAction: colorAction
            })
        ]
    }

    return Object.freeze({
        info
    });
}

module.exports = ledBulb();
```

Чтобы не дублировать отправку запросов для получения текущего состояния устройства, можно использовать обработчик globalQuery:

```JavaScript
// Файл ledBulb.js

const request = require("request");

const OnOffCapability = require("wirone").capabilities.OnOff;
const ColorCapability = require("wirone").capabilities.ColorSetting;

const ledBulb = () => {
    // Функция globalQuery выполняется при запросе состояния устройства, и позволяет установить глобальное состояние,
    // данные из которого в дальнейшем можно использовать для присвоения значений умений и встроенных датчиков
    const globalQuery = () => new Promise((resolve, reject) => {
        request({
            url: "http://192.168.0.110/state",
            method: "get"
        }, (error, response, body) => {
            if (error != null)
                return reject("INTERNAL_ERROR");

            // Устанавливаем полученный от устройства JSON-объект как глобальное состояние
            resolve(body);
        });
    });

    const powerQuery = (globalState) => new Promise((resolve, reject) => {
        // Если была использована функция globalQuery, объект, который был передан в resolve, доступен через параметр globalState
        // в любом обработчике состояния
        
        resolve({
            instance: "on",
            // Установка значения для умения On_off из глобального состояния
            value: globalState.power
        });
    });

    const powerAction = (state) => new Promise((resolve, reject) => {
        let newPowerState = state.value;

        request({
            url: "http://192.168.0.110/state",
            method: "post",
            json: {
                power: newPowerState
            }
        }, (error, response, body) => {
            if (error != null)
                return reject("INTERNAL_ERROR");
                
            resolve({
                instance: "on",
                action_result: {
                    status: "DONE"
                }
            });
        });
    });
    
    const colorQuery = (globalState) => new Promise((resolve, reject) => {
        resolve({
            instance: "rgb",
            // Аналогично, устанавливаем значение цвета для умения Color_setting
            value: {
                r: globalState.color.r,
                g: globalState.color.g,
                b: globalState.color.b
            }
        });
    });
    
    const colorAction = (state) => new Promise((resolve, reject) => {
        let newColorState = state.value;

        request({
            url: "http://192.168.0.110/state",
            method: "post",
            json: {
                color: newColorState
            }
        }, (error, response, body) => {
            if (error != null)
                return reject("INTERNAL_ERROR");
                
            resolve({
                instance: "rgb",
                action_result: {
                    status: "DONE"
                }
            });
        });
    });

    const info = {
        name: "Лампочка",
        type: "devices.types.light",

        globalQuery: globalQuery,

        capabilities: [
            OnOffCapability({
                onQuery: powerQuery,
                onAction: powerAction
            }),
            
            ColorCapability({
                parameters: {
                    color_model: "rgb"
                },

                onQuery: colorQuery,
                onAction: colorAction
            })
        ]
    }

    return Object.freeze({
        info
    });
}

module.exports = ledBulb();
```

Другой пример описание устройства вы можете посмотреть в [репозитории шаблона для Wirone](https://github.com/Yuukari/wirone-template/blob/main/src/devices/temperatureSensor.js).

## Планы развития на будущее

Планируется реализация:
- Инструментов для удобного взаимодействия с [API сервиса уведомлений](https://yandex.ru/dev/dialogs/smart-home/doc/reference-alerts/resources-alerts.html)
- Поддержки встроенных датчиков с типом [Event](https://yandex.ru/dev/dialogs/smart-home/doc/concepts/event.html), когда их функционал выйдет из стадии бета-тестирования
