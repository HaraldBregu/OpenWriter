import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../../../resources/i18n/en/main.json'
import it from '../../../resources/i18n/it/main.json'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    it: { translation: it }
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
})

export default i18n
