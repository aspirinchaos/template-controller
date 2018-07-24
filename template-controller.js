import ReactiveObject from './reactive-object';
import { Meteor } from 'meteor/meteor';

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
 * @param templateName {string} - имя тимплейта
 * @param config {{state: object}, {props: SimpleSchema}, {helpers: object}, {events: object},
 *   {onCreated: function}, {onRendered: function}, {onDestroyed: function}, {private: object}}
 *   Настройки тимплейта
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
};

TemplateController.bindToTemplateInstance = bindToTemplateInstance;
TemplateController.bindAllToTemplateInstance = bindAllToTemplateInstance;

export { TemplateController, ReactiveObject };
