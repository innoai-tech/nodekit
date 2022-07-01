# Webapp Serve

Simple webapp serve

# Configuration

## `APP_ROOT`

```
/app/
    __built__/
        xxx.js
    sw.js
    favicon.ico
    index.html
```

## `ENV`

be used to replace `__ENV__` in `index.html`

## `APP_BASE_HREF`

can replace `__APP_BASE_HREF__` in `index.html` if exists

in html could use `base` tag: https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/base

## `APP_CONFIG` or `APP_CONFIG__*`

be used to replace `__APP_CONFIG__` in `index.html`

* format: `key1=value1,key2=value2`
* `APP_CONFIG__*` will join to `APP_CONFIG`
