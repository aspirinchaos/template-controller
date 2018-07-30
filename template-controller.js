import ReactiveObject from './reactive-object';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';

// This allows us to write inline objects in Blaze templates
// like so: {{> template param=(object key="value") }}
// => The template's data context will look like this:
// { param: { key: "value" } }
Template.registerHelper('object', ({ hash }) => hash);

// This allows us to write inline arrays in Blaze templates
// like so: {{> template param=(array 1 2 3) }}
// => The template's data context will look like this:
// { param: [1, 2, 3] }
// удаляем последний элемент, попадает blaze обработчик
Template.registerHelper('array', (...args) => args.slice(0, -1));

/**
 * Привязка функции к instance Тимплейта
 * @param handler {function} функция для привязки
 * @returns {function}
 */
const bindToTemplateInstance = handler => (...args) => handler.apply(Template.instance(), args);

/**
 * Множественная привязка объекта функций
 * @param handlers {object} - объект с функциями
 * @returns {object} - объект с привязанными функциями
 */
const bindAllToTemplateInstance = (handlers) => {
  Object.keys(handlers).forEach((key) => {
    handlers[key] = bindToTemplateInstance(handlers[key]);
  });
  return handlers;
};
/**
 * Функция для генерации тимплейта
 * Возвращает функцию, которая делает доступным использование тимплейта в хелперах
 * функция возвращает сгенерированный HTML тимплейта
 * и она имеет всего 1 необязательный параметр, который должен быть объектом
 * в нем передается data контекста тимплейта.
 * Функция не реактивная, потому что генерирует только HTML,
 * что бы работал ререндер, необходимо использовать функцию в реактивном контексте
 * Создание
 * <code>const Col = createRender('Col');</code>
 * Использование
 * <code>
 * Col();
 * Col({xs: 1});
 * Col({xs:1, size: 2, offset: 3});
 * </code>
 * @param templateName {string} - имя тимплейта
 * @param config {{state: object}, {props: SimpleSchema}, {helpers: object}, {events: object},
 *   {onCreated: function}, {onRendered: function}, {onDestroyed: function}, {private: object}}
 *   Настройки тимплейта
 * @returns {function(*=): (string)}
 * @constructor
 */
const TemplateController = function (templateName, config) {
  // Template reference
  const template = Template[templateName];
  if (!template) {
    throw new Meteor.Error('template-not-found', `No template <${templateName}> found.`);
  }
  const {
    state, props, helpers = {}, events, onCreated, onRendered, onDestroyed, private = {},
  } = config;

  // Инициируем state и props
  template.onCreated(function () {
    this.state = new ReactiveObject(state);
    // Private
    if (private) {
      Object.keys(private).forEach((key) => {
        this[key] = private[key];
      });
    }
    // Add sugar method for triggering custom jQuery events on the root node
    this.triggerEvent = (eventName, data) => {
      // Force best practice of having a single root element for components!
      if (this.firstNode !== this.lastNode) {
        throw new Meteor.Error('root-element-required', 'Please define a single root DOM element for your template.\n' +
          'Learn more about this issue: https://github.com/meteor-space/template-controller/issues/6');
      }
      this.$(this.firstNode).trigger(eventName, data);
    };

    // Организум работу props
    if (props) {
      const keys = {};
      props.objectKeys().forEach(key => {
        keys[key] = undefined;
      });
      this.props = new ReactiveObject(keys);
      if (!props.validate) {
        throw new Meteor.Error('property-validate-required', 'props должен быть SimpleSchema');
      }
      // props должны быть реактивными
      this.autorun(() => {
        const currentData = props.clean(Template.currentData() || {});
        try {
          props.validate(currentData);
          this.props.setState(currentData);
        } catch (e) {
          // ошибки не должны блокировать работу приложения
          // а давать объяснение
          e.details.forEach(error => {
            console.log(`В тимплейт "${templateName}" передано неверное значение параметра "${error.name}"!`);
            console.log(`Тип ошибки: "${error.type}" сообщение ошибки: "${error.message}"`);
            console.log('Значение переданного параметра:', error.value);
            console.log('Детали ошибки', error);
          });
        }
      });
    }
  });

  // для доступа к state в spacebars
  helpers.state = function () {
    return this.state;
  };
  // для доступа к props в spacebars
  helpers.props = function () {
    return this.props;
  };
  // привяжем все helpers к instance
  template.helpers(bindAllToTemplateInstance(helpers));

  // привяжем все events к instance
  if (events) {
    template.events(bindAllToTemplateInstance(events));
  }

  // добавим Lifecycle
  if (onCreated) {
    template.onCreated(onCreated);
  }
  if (onRendered) {
    template.onRendered(onRendered);
  }
  if (onDestroyed) {
    template.onDestroyed(onDestroyed);
  }

  return (data = {}) => Blaze.toHTMLWithData(template, data);
};

TemplateController.bindToTemplateInstance = bindToTemplateInstance;
TemplateController.bindAllToTemplateInstance = bindAllToTemplateInstance;

export { TemplateController, ReactiveObject };
