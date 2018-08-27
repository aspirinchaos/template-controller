import { ReactiveVar } from 'meteor/reactive-var';

/**
 * Реализация похожа на ReactionDict
 */
class ReactiveObject {
  /**
   * Создадим геттеры и сеттеры для переданных полей
   * @param properties {object} - список полей с дефолтными значениями
   */
  constructor(properties = {}) {
    this.addProperties(properties);
  }

  /**
   * Для работы spead
   * @return {{}}
   */
  [Symbol.iterator]() {
    return this.all();
  }

  /**
   * Создание гет и сет для поля
   * @param key {string} - имя поля
   * @param defaultValue [{any}] - дефолтное значение
   */
  addProperty(key, defaultValue = undefined) {
    const property = new ReactiveVar(defaultValue);
    Object.defineProperty(this, key, {
      get: () => property.get(),
      set: (value) => {
        property.set(value);
      },
      enumerable: true,
    });
  }

  /**
   * Множественное формирование гет и сет
   * @param properties {object} - список полей
   */
  addProperties(properties = {}) {
    Object.keys(properties).forEach((key) => {
      this.addProperty(key, properties[key]);
    });
  }

  /**
   * Получение всех данных
   * @returns {{}}
   */
  all() {
    const values = {};
    Object.keys(this).forEach((key) => {
      values[key] = this[key];
    });
    return values;
  }

  /**
   * Множественное присвоение значений
   * @param properties {object} - список значений
   */
  setState(properties) {
    Object.keys(properties).forEach((key) => {
      this[key] = properties[key];
    });
  }
}

export default ReactiveObject;
