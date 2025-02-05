/*
 * Copyright (C) 2019  SuperGreenLab <towelie@supergreenlab.com>
 * Author: Constantin Clauzel <constantin.clauzel@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { products, sellingPoints, sellers, brandProducts, brands, regions, collections, relatedProducts } from '~/config/products.json'

import { loadFromStorage, saveToStorage } from '~/lib/client-side.js'

const guessDefautRegion = () => {
  const off = new Date().getTimezoneOffset() / 60
  if (off <= 0 && off >= -3) {
    return regions.find(r => r.code == 'EU')
  } else if (off >= 3 && off <= 8) {
    return regions.find(r => r.code == 'NA')
  }
  return regions[0]
}

const STORAGE_ITEM='eshop6'

export const state = () => {
  let defaults = {
    offsetRegion: regions[0],
    region: regions[0],
  }
  return defaults
}

const storeState = (state) => {
  saveToStorage(STORAGE_ITEM, JSON.stringify(state))
}

//const arrayContained = (a1, a2) => a1.every(a => a2.indexOf(a) !== -1)
const arrayContained = (a1, a2) => a1.findIndex(a => a2.indexOf(a) !== -1) !== -1
const productsWithTypes = (state, types) => products.filter(p => arrayContained(Array.isArray(types) ? types : [types], p.type))

export const actions = {
  nuxtClientInit(context) {
    const saved = loadFromStorage(STORAGE_ITEM)
    if (saved) {
      context.commit('setState', JSON.parse(saved))
    } else {
      context.commit('setState', {
        offsetRegion: guessDefautRegion(),
        region: guessDefautRegion(),
      })
    }
  },
}

export const mutations = {
  setState(state, newState) {
    Object.assign(state, newState)
  },
  setRegion(state, region) {
    state.region = region
    storeState({
      offsetRegion: state.offsetRegion,
      region
    })
  },
}

export const getters = {
  bundles: state => {
    return productsWithTypes(state, 'SGL_BUNDLE')
  },
  leds: state => {
    return productsWithTypes(state, 'SGL_LED')
  },
  accessories: state => {
    return productsWithTypes(state, 'SGL_ACCESSORIES')
  },
  sellingPointWithSlug: state => slug => sellingPoints.find(sp => sp.slug.toLowerCase() == slug.toLowerCase()),
  productWithSlug: state => slug => products.find(p => p.slug.toLowerCase() == slug.toLowerCase()),
  productsWithTypes: state => types => productsWithTypes(state, types),

  product: state => id => products.find(p => p.id == id),
  sellingPointWithID: state => id => sellingPoints.find(sp => sp.id == id),
  brandProduct: state => id => brandProducts.find(bp => bp.id == id),
  brand: state => id => brands.find(b => b.id == id),
  seller: state => id => sellers.find(s => s.id == id),
  variants: state => id => {
    let brandProduct = brandProducts.find(bp => bp.id == id)
    if (brandProduct.variantOf) {
      brandProduct = brandProducts.find(bp => bp.id == brandProduct.variantOf[0])
    }
    return [brandProduct].concat(brandProducts.filter(bp => bp.variantOf && bp.variantOf[0] == brandProduct.id))
  },
  collection: (state, getters) => slug => collections.filter(c => c.slug == slug).sort((c1, c2) => c1.order - c2.order).map(c => getters.product(c.Product[0])),

  regionTree: (state) => (region) => {
    const regionTree = (region, acc=[]) => {
      acc.push(region)
      if (region.in) {
        return regionTree(regions.find(r => r.id == region.in[0]), acc)
      }
      return acc
    }
    return regionTree(region)
  },

  sellingPoint: (state, getters) => sellingPoints => {
    const { region } = state
    const regions = getters.regionTree(region).map(r => r.id)
    for (let i in regions) {
      const region = regions[i]
      const sp = sellingPoints.find(sp => sp.regions.find(r => r.id == region))
      if (sp) return sp
    }
  },
  sellingPointForBrandProduct: (state, getters) => id => getters.sellingPoint(sellingPoints.filter(sp => sp.BrandProduct[0] == id)),
  sellingPointForProduct: (state, getters) => id => getters.sellingPoint(sellingPoints.filter(sp => sp.Product[0] == id)),

  availableRegions: (state, getters) => regions.filter(r => r.id == state.offsetRegion.id || (r.in && getters.regionTree(r).find(r2 => r2.id == state.offsetRegion.id))),

  relatedProducts: (state, getters) => id => relatedProducts.filter(rp => rp.to[0] == id).sort((rp1, rp2) => rp1.order - rp2.order),
}
