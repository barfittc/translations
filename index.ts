import type { App, Plugin as VuePlugin } from "vue";
import { reactive, inject } from 'vue'

/**
 * state of the translation, reactivly changes with the language
 */
export interface TranslationState {
    toString:()=>string
    value:string
    args:any[]
}

/**
 * Translations state object, used to retieve and cache translations with replace args using c# replace format
 * {0}...{args.length - 1}
 */
export interface TranslationsState<TMap extends {}, Translations extends { [lang: string]: TMap }> {
    /**
     * the lookup map provided by addTranslations
     */
    transations: Translations
    map: TMap,
    /**
     * current language
     */
    language: keyof Translations
    /**
     * the available languages
     */
    languages: (keyof Translations)[]
    /**
     * Translates from the given string
     * @param language desired language
     * @param lookup the translation lookup path
     * @param args variables to replace format {#}. Matches c# string.Format
     */
    translateFromLanguage(language: keyof Translations, lookup: string, ...args: any[]): string
    /**
     * Changes the language
     * @param language desired language
     */
    changeLanguage(language: keyof Translations): void
    /**
     * Translates using saved language
     * @param lookup the translation lookup path
     * @param args replacement variables
     */
    translate(lookup: string, ...args: any[]): TranslationState
}

const _transations: { state?: TranslationsState<{}, { [lang: string]: {} }> } = { state: undefined };
export default _transations.state;

/**
 * Gets the translation State
 * @returns translation State
 */
export function useTranslations<TMap extends {}, Translations extends { [lang: string]: TMap }>(): TranslationsState<TMap, Translations> {
    if (!_transations.state) {
        const i = inject<any>("@barfittc/translations");
        if (!i) {
            throw new Error("You must addTranslations before you can useTranslations");
        }
        return i;
    }
    return <TranslationsState<TMap, Translations>><unknown>_transations.state;
}
/**
 * Configures the translation state, and add's $translations & $t to the template scope
 * @param defaultLang
 * @param translationMap
 * @returns VuePlugin
 */
export function addTranslations<TMap extends {}, Translations extends { [lang: string]: TMap }>(defaultLang: keyof Translations, translations: Translations): VuePlugin {
    /**
     * Generates a string lookup map to use for translations
     * @param currentLookup a language map to go off of
     * @param currentString the current key path
     */
    function generateTranslationMap(currentLookup: any, currentString?: string): TMap {

        const resultMap: any = {};

        for (const key of Object.keys(currentLookup)) {

            const value = currentLookup[key];
            const keyedPath = (currentString === undefined ? "" : currentString + ".") + key;

            resultMap[key] = (typeof value === 'string' || value instanceof String)
                ? keyedPath
                : generateTranslationMap(value, keyedPath);
        }
        return resultMap;
    }
    return {
        install: (app: App) => {
            const keys = <(keyof Translations)[]><unknown>Object.keys(translations);
            if (!keys[0]) {
                throw new Error("No language keys found. Map must be { [ lang:string ]: {} }")
            }

            const translatedRefs: {
                [key: string]: TranslationState
            } = {};

            const state = reactive<TranslationsState<TMap, Translations>>({
                transations: translations,
                language: defaultLang,
                map: generateTranslationMap(translations[keys[0]]),
                languages: keys,
                changeLanguage(language): void {
                    if (this.language === language)
                        return;

                    this.language = language;

                    // retranslate all the strings
                    for (const key of Object.keys(translatedRefs)) {
                        translatedRefs[key].value = this.translateFromLanguage(language, key, translatedRefs[key].args);
                    }
                },
                translate(lookup, ...args) {

                    const key = `${lookup}.${args.join(".")}`;

                    if (!translatedRefs[key]) {
                        translatedRefs[key] = reactive<TranslationState>({
                            value: this.translateFromLanguage(this.language, lookup, args),
                            args: args,
                            toString() {
                                return this.value;
                            },
                        });
                    }
                    return translatedRefs[key];
                },
                translateFromLanguage(language, lookup, ...args) {
                    const paths = lookup.split(".");

                    if (args.length === 1 && Array.isArray(args[0])) {
                        args = args[0];
                    }

                    if (!this.transations[language]) {
                        throw new Error("language doesn't exist in the lookup map");
                    }
                    let currentLookup: any = this.transations[language];
                    for (const path of paths) {
                        if (path in currentLookup)
                            currentLookup = currentLookup[path];
                    }

                    let result = `${currentLookup}`;
                    for (let x = 0; x < args.length; x++) {
                        result = result.replace(`{${x}}`, `${args[x]}`);
                    }

                    return result;
                }
            });

            app.config.globalProperties.$translations = <any>state.map;
            app.config.globalProperties.$t = state.translate.bind(state);

            _transations.state = <any>state;
            app.provide("@barfittc/translations", state);
        }
    };
}
