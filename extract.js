import axios from 'axios'
import fs, { promises } from 'fs'

const fetchLigaPokemon = async (url) => {
  try {
    const response = await axios
      .get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })

    await promises.writeFile('liga.html', response.data)
    return response.data
  } catch (err) {
    console.error("Error fetching Liga Pokemon: ", err)
  }
}

const extractDefinitions = (html) => {
  try {
    const regexCardsEditions = /var cards_editions = ([^\n]*);/
    const regexCardsStock = /var cards_stock = ([^\n]*);/
    const regexCardsStores = /var cards_stores = ([^\n]*);/
    const regexDataLanguage = /var dataLanguage = ([^\n]*);/
    const regexDataQuality = /var dataQuality = ([^\n]*);/
    const regexDataExtras = /var dataExtras = ([^\n]*);/
  
    const cardsEditionsMatches = html.match(regexCardsEditions)
    const cardsStockMatches = html.match(regexCardsStock)
    const cardsStoresMatches = html.match(regexCardsStores)
    const dataLanguageMatches = html.match(regexDataLanguage)
    const dataQualityMatches = html.match(regexDataQuality)
    const dataExtrasMatches = html.match(regexDataExtras)
  
    const output = {
      cardsEditions: cardsEditionsMatches ? JSON.parse(cardsEditionsMatches[1]) : null,
      cardsStock: cardsStockMatches ? JSON.parse(cardsStockMatches[1]) : null,
      cardsStores: cardsStoresMatches ? JSON.parse(cardsStoresMatches[1]) : null,
      dataLanguage: dataLanguageMatches ? JSON.parse(dataLanguageMatches[1]) : null,
      dataQuality: dataQualityMatches ? JSON.parse(dataQualityMatches[1]) : null,
      dataExtras: dataExtrasMatches ? JSON.parse(dataExtrasMatches[1]) : null
    }
  
    return output
  } catch (err) {
    console.error("Error extracting definitions: ", err)
  }  
}

const getCheapestCards = ({
  cardsStock,
  dataLanguage,
  dataQuality,
}) => {
  try {
    const firstCardsByQuality = dataQuality
      .map(quality => {
        const card = cardsStock.find(card => card.qualid == quality.id)

        if (!card) return

        return {
          qualidade: quality.label,
          preco: getCardPrice(card),
          idioma: dataLanguage.find(language => language.id == card.idioma).label
        }
      })
      .filter(card => card)
    
    return firstCardsByQuality
  } catch (err) {
    console.error("Error getting cheapest cards: ", err)
  }
}

const getCardPrice = (card) => {
  try {
    switch (true) {
      case !!card.precoFinal:
        return Number(card.precoFinal)
      case !!card.precoCss:
        return getCardPrecoCss(card.precoCss)
      default:
        return null
    }
  } catch (err) {
    console.error("Error getting card price: ", err)
  }
}

const getCardPrecoCss = (precoCss) => {
  try {
    const cssPricesDecoded = JSON.parse(fs.readFileSync('css_prices_decoded.json', 'utf-8'))
    
    const precoCssSplitted = precoCss
      .split(';')
      .map(priceCss => {
        if (priceCss == 'V') return '.'
        const priceCssPartSplitted = priceCss.split(' ')
        
        console.log(priceCssPartSplitted)
        Object.entries(cssPricesDecoded).forEach(([key, value]) => {
          if (priceCssPartSplitted.every(part => key.includes(part))) {
            console.log("deu certo")
            return value
          }
        })
      })
      .filter(price => price)
      .join('')

    console.log(precoCssSplitted)
    return Number(precoCssSplitted)
  } catch (err) {
    console.error("Error getting card precoCss: ", err)
  }
}

const getCardData = async (card) => {
  try {
    card = card.replace(' ', '%20')

    const url = `https://www.ligapokemon.com.br/?view=cards/card&card=${card}`
    const urlHtml = await fetchLigaPokemon(url)
    const cardProps = extractDefinitions(urlHtml)
    const cheapestCards = getCheapestCards(cardProps)

    return { cheapestCards }
  } catch (err) {
    console.error("Error getting card data: ", err)
  }
}

const getCardSearch = async (filter) => {
  try {
    if (filter.includes('/')) filter = filter.replace('/', '%2F')
    const url = `https://ac.ligamagic.com.br/api/cardsearch?tcg=2&maxQuantity=8&maintype=1&query=${filter}`
  
    const response = await axios
      .get(url)
      .then(response => response.data)
      .catch(_ => null)
  
    if (!response || !response?.data.length) {
      console.log("Card not found")
      return
    }
  
    return response.data[0]
  } catch (err) {
    console.error("Error getting card search: ", err)
  }
}

const main = async () => {
  const firstResultCardSearch = await getCardSearch("GG35/GG70")
  if (!firstResultCardSearch) return

  const { cheapestCards } = await getCardData(firstResultCardSearch.sNomePortugues)

  console.log(cheapestCards)
}

main()
