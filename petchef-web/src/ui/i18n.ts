import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      title: 'PetChef',
      inventory: 'Inventory',
      suggestHuman: 'Suggest Human Recipes',
      suggestPet: 'Suggest Pet Recipes',
      suggestDuo: 'Suggest Duo Recipes',
      pets: 'Pets',
      kcalPerMeal: 'kcal/meal',
      language: 'Language',
    },
  },
  zh: {
    translation: {
      title: '冰箱萌廚',
      inventory: '庫存',
      suggestHuman: '推薦人用食譜',
      suggestPet: '推薦寵用食譜',
      suggestDuo: '雙食譜推薦',
      pets: '寵物',
      kcalPerMeal: '每餐熱量（卡）',
      language: '語言',
    },
  },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n