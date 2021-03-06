# Cookbook

- General
  - How to link to pages (with our without locale)
  - How to make a paginated page (posts & posts by category)
    - Mention that paginated pages can be non-localized
  - How to add a page without locale
  - How to add a binary route, e.g. generated PNG
  - How to add a route in a random place, /index.ts => /weird/place/index.html
  - How to add data value in permalink with permalink function (instance: RouteInstance) => string
    - How to link to that page? url(instance)?
  - Generate a binary "page" => `Page::render` => buffer
  - How to change headers
  - Give a concrete type to `GetData` & `Render` via `MaumaRoute<T>()`
  - Add assets (favicon, images…) in `public` folder
  - How to define URL parameters
    - `[param]`: regular
    - `[...all]`: Catch-all
    - Default values
- Nunjucks
  - Modify via `configureNunjucks`
  - Add global variables available in all templates
- i18n
  - How to prefix all locales and create a language selection page in `/`
  - How to create a language switcher (`localeurl`)
  - How to translate URLs
  - How to add translations (messages)
    - How to use varibles in translations `{{var}}`
    - Explain nested translations `foo.bar.baz`
    - Explain message cutting, e.g.: `'foo:0'|translate`, where `foo` is: `Click |here|`
  - How to load translations from a YAML file

---

How to add conditional dash on title:

```njk
<!-- layout.njk -->
<title>
  {% set title %}{% block title %}{% endblock %}{% endset %}
  {% if title %}
    {{ title }} - Mauma SSG Playground
  {% else %}
    Mauma Static Site Generator Playground
  {% endif %}
</title>
```

```njk
<!-- index.njk -->
{% extends 'layout.njk' %}
{% block title %}{% endblock %}
```

Gives: `Mauma: Static Site Generator Playground`

```njk
<!-- about.njk -->
{% extends 'layout.njk' %}
{% block title %}About{% endblock %}
```

Gives: `About - Mauma SSG Playground`
