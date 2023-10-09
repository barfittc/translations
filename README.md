strongly typed translation api for vue

setup: create a new directory in your src called `translations`

inside the directory, create an `index.ts`

inside the `index.ts` file
```ts
import { useTranslations as useTranslationsBase } from "@barfittc/translations"

// your translations, to be mapped
import en from "./en"
import fr from "./fr"

// your translations defininions type
export type Translations = {
    "hello":string,
    "hello2":string,
    "messages": {
      "hello": string
    }
}

// the translation May, this gets passed to the addTranslations
export const TranslationMap = {
    "en": en,
    "fr": fr
}
// Type of list of languages
export type Language = keyof typeof TranslationMap;

// shortcut helper
export const useTranslations = useTranslationsBase<Translations, typeof TranslationMap>;
```

create a new ts for every language you wish to support, {0} are chunks that will get replaged by args provided by translate, 0 index from first arg
```ts
import type { Translations } from ".";
const translations: Translations = {
    "hello":"hello world",
    "hello2":"Hello {0}",
    "messages": {
      "hello": "Hello Solar System"
    }
};
export default translations;
```

Add to your `main.ts` vue definition
```ts
createApp(App)
    .use(addTranslations("en"/* default lang, key of the map defined */, TranslationMap /* the map defined with all keys being each language */))
	.mount('#app')
```


in your <script setup lang="ts"
```ts
const t = useTranlations();
console.log(t.translate(t.map.messages.hello))
t.changeLanguage("fr");
```

use in your <template>
```html
<div>$t($translations.hello)</div>
<div>$t($translations.hello2, "galaxy")</div>
```
