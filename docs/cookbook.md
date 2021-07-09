# Cookbook

- General
  - How to link to pages (with our without locale)
  - How to make a paginated page (blog index)
  - How to add a page without locale
  - How to add a binary route, e.g. generated PNG
  - How to add a route in a random place, /index.ts => /weird/place/index.html
  - How to add data value in permalink with permalink function (instance: RouteInstance) => string
  - Generate a binary "page" => `Page::render` => buffer
  - How to change headers
  - Give a concrete type to `GetData` & `Render` via `MaumaRoute<T>()`
  - Add assets (favicon, images…) in `public` folder
- i18n
  - How to prefix all locales and create a language selection page in `/`
  - How to create a language switcher
  - How to translate URLs
  - How to add translations (messages)
    - How to use varibles in translations `{{var}}`
    - Explain nested translations

---

How to add conditional dash on title:

```njk
<!-- layout.njk -->
<title>
  {% set title %}{% block title %}{% endblock %}{% endset %}
  {% if title %}
    {{ title }} - Mauma SSG
  {% else %}
    Mauma: Static Site Generator
  {% endif %}
</title>
```

```njk
<!-- index.njk -->
{% extends 'layout.njk' %}
{% block title %}{% endblock %}
```

Gives: `Mauma: Static Site Generator`

```njk
<!-- about.njk -->
{% extends 'layout.njk' %}
{% block title %}About{% endblock %}
```

Gives: `About - Mauma SSG`
