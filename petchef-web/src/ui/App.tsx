import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type InventoryItem = { id: string; name: string; quantity: number; unit: string; expiresOn: string }

type Ranked<T> = { score: number; missing: { name: string; qty: number; unit: string }[]; recipe: T }

type Recipe = { id: string; title: string; variant: 'human' | 'pet' }

type Pet = { id: string; name: string }

export function App() {
  const { t, i18n } = useTranslation()
  const [inv, setInv] = useState<InventoryItem[]>([])
  const [human, setHuman] = useState<Ranked<Recipe>[]>([])
  const [pet, setPet] = useState<Ranked<Recipe>[]>([])
  const [duo, setDuo] = useState<any[]>([])
  const [pets, setPets] = useState<Pet[]>([])
  const [kcal, setKcal] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch('/v1/inventory').then(r => r.json()).then(d => setInv(d.items || []))
    fetch('/v1/recipes/suggest?variant=human').then(r => r.json()).then(d => setHuman(d.suggestions || []))
    fetch('/v1/recipes/suggest?variant=pet').then(r => r.json()).then(d => setPet(d.suggestions || []))
    fetch('/v1/duo/suggest').then(r => r.json()).then(d => setDuo(d.pairs || []))
    fetch('/v1/pets').then(r => r.json()).then(d => setPets(d.pets || []))
  }, [])

  useEffect(() => {
    pets.forEach(p => {
      fetch(`/v1/pets/${p.id}/calories`).then(r => r.json()).then(d => setKcal(k => ({ ...k, [p.id]: d.kcalPerMeal })))
    })
  }, [pets])

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', margin: '24px', lineHeight: 1.4 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{t('title')}</h1>
        <div>
          <label>{t('language')}:</label>{' '}
          <select value={i18n.language} onChange={e => i18n.changeLanguage(e.target.value)}>
            <option value="zh">繁中</option>
            <option value="en">English</option>
          </select>
        </div>
      </header>

      <section>
        <h2>{t('inventory')}</h2>
        <ul>
          {inv.map(i => (
            <li key={i.id}>{i.name} — {i.quantity} {i.unit} (exp {i.expiresOn})</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t('suggestHuman')}</h2>
        <ul>
          {human.map((s, idx) => (
            <li key={idx}>{s.recipe.title} (score {s.score})</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t('suggestPet')}</h2>
        <ul>
          {pet.map((s, idx) => (
            <li key={idx}>{s.recipe.title} (score {s.score})</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t('suggestDuo')}</h2>
        <ul>
          {duo.map((p: any, idx) => (
            <li key={idx}>{p.human.recipe.title} + {p.pet.recipe.title} (score {p.score})</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t('pets')}</h2>
        <ul>
          {pets.map(p => (
            <li key={p.id}>{p.name} — {kcal[p.id] ? `${kcal[p.id]} ${t('kcalPerMeal')}` : '…'}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}