import { Getter, JSONPath, JSONQueryProperty, JSONQuery } from './types'
import { compile } from './compile'
import { isArray, isString } from './is'
import { buildFunction } from './buildFunction'

export const get = (path: string | number | JSONPath = []) =>
  isArray(path)
    ? (data: unknown) => {
        let value = data

        for (const prop of path) {
          value = value?.[prop]
        }

        return value
      }
    : (data: unknown) => data?.[path]

export const string = (text: string) => () => text

export const map = <T>(callback: JSONQuery) => {
  const _callback = compile(callback)
  return (data: T[]) => data.map(_callback)
}

export const filter = <T>(...predicate: JSONQuery[]) => {
  const _predicate = compile(predicate.length === 1 ? predicate[0] : predicate)
  return (data: T[]) => data.filter(_predicate)
}

export const sort = <T>(path: JSONQueryProperty = ['get'], direction?: 'asc' | 'desc') => {
  const getter = compile(path)
  const sign = direction === 'desc' ? -1 : 1

  function compare(itemA: unknown, itemB: unknown) {
    const a = getter(itemA)
    const b = getter(itemB)
    return a > b ? sign : a < b ? -sign : 0
  }

  return (data: T[]) => data.slice().sort(compare)
}

export const pick = (...properties: JSONQueryProperty[]) => {
  const getters: Getter[] = properties.map(([_get, path]) => [
    isString(path) ? path : path[path.length - 1],
    get(path)
  ])

  return (data: Record<string, unknown>): unknown => {
    if (isArray(data)) {
      return data.map((item: Record<string, unknown>) => _pick(item, getters))
    }

    return _pick(data, getters)
  }
}

const _pick = (object: Record<string, unknown>, getters: Getter[]): unknown => {
  const out = {}

  getters.forEach(([key, getter]) => {
    out[key] = getter(object)
  })

  return out
}

export const groupBy = <T>(path: JSONQueryProperty) => {
  const getter = compile(path)

  return (data: T[]) => {
    const res = {}

    for (const item of data) {
      const value = getter(item) as string
      if (res[value]) {
        res[value].push(item)
      } else {
        res[value] = [item]
      }
    }

    return res
  }
}

export const keyBy = <T>(path: JSONQueryProperty) => {
  const getter = compile(path)

  return (data: T[]) => {
    const res = {}

    data.forEach((item) => {
      const value = getter(item) as string
      res[value] = res[value] ?? item
    })

    return res
  }
}

export const flatten = () => (data: unknown[]) => data.flat()

export const uniq =
  () =>
  <T>(data: T[]) => [...new Set(data)]

export const uniqBy =
  <T>(path: JSONQueryProperty) =>
  (data: T[]): T[] =>
    Object.values(groupBy(path)(data)).map((groups) => groups[0])

export const and = buildFunction((a, b) => a && b)
export const or = buildFunction((a, b) => a || b)
export const eq = buildFunction((a, b) => a === b)
export const gt = buildFunction((a, b) => a > b)
export const gte = buildFunction((a, b) => a >= b)
export const lt = buildFunction((a, b) => a < b)
export const lte = buildFunction((a, b) => a <= b)
export const ne = buildFunction((a, b) => a !== b)

export const _in = (path: string, values: string[]) => {
  const getter = compile(path)
  return (data: unknown) => values.includes(getter(data) as string)
}
export const _not_in = (path: string, values: string[]) => {
  const getter = compile(path)
  return (data: unknown) => !values.includes(getter(data) as string)
}
export const regex = (path: JSONQuery, expression: string, options?: string) => {
  const regex = new RegExp(expression, options)
  const getter = compile(path)
  return (data: unknown) => regex.test(getter(data) as string)
}
export const not = buildFunction((value: unknown) => !value)
export const exists = buildFunction((value: unknown) => value !== undefined)

export const add = buildFunction((a: number, b: number) => a + b)
export const subtract = buildFunction((a: number, b: number) => a - b)
export const multiply = buildFunction((a: number, b: number) => a * b)
export const divide = buildFunction((a: number, b: number) => a / b)
export const pow = buildFunction((a: number, b: number) => a ** b)
export const mod = buildFunction((a: number, b: number) => a % b)

export const limit =
  (count: number) =>
  <T>(data: T[]) =>
    data.slice(0, count)

export const keys = () => Object.keys

export const values = () => Object.values

export const prod = () => (data: number[]) => data.reduce((a, b) => a * b)

export const sum = () => (data: number[]) => data.reduce((a, b) => a + b)

export const average = () => (data: number[]) => sum()(data) / data.length

export const min = () => (data: number[]) => Math.min(...data)

export const max = () => (data: number[]) => Math.max(...data)

export const abs = () => Math.abs

export const round = buildFunction((value: number, digits = 0) => {
  const num = Math.round(Number(value + 'e' + digits))
  return Number(num + 'e' + -digits)
})

export const size =
  () =>
  <T>(data: T[]) =>
    data.length
