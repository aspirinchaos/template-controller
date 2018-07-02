Package.describe({
  summary: 'Syntactic sugar for blaze templates',
  name: 'template-controller',
  version: '0.4.0',
  git: 'https://github.com/meteor-space/template-controller.git',
});

Package.onUse((api) => {
  api.versionsFrom('1.5');

  api.use([
    'ecmascript',
    'reactive-var',
    'templating',
    'blaze-html-templates',
  ]);

  api.mainModule('template-controller.js', 'client');
});
