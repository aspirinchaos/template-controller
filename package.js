Package.describe({
  summary: 'Syntactic sugar for blaze templates',
  name: 'template-controller',
  version: '0.4.1',
  git: 'https://github.com/meteor-space/template-controller.git',
});

Package.onUse((api) => {
  api.versionsFrom('1.5');

  api.use([
    'ecmascript',
    'reactive-var',
    'templating',
  ]);

  api.mainModule('template-controller.js', 'client');
});
