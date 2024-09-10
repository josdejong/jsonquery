import {
  Evaluator,
  FunctionsMap,
  Getter,
  JSONQuery,
  JSONQueryFunction,
  JSONQueryObject,
  JSONQueryOptions,
  JSONQueryPipe
} from './types'
import { isArray, isObject, isString } from './is'
import * as coreFunctions from './functions'

const functionsStack: FunctionsMap[] = [coreFunctions]

export function compile(query: JSONQuery, options?: JSONQueryOptions): Evaluator {
  functionsStack.unshift({ ...functionsStack[0], ...options?.functions })

  try {
    const exec = _compile(query, functionsStack[0])

    return (data) => {
      try {
        return exec(data)
      } catch (err) {
        // attach a stack to the error
        err.jsonquery = [{ data, query }, ...(err.jsonquery ?? [])]

        throw err
      }
    }
  } finally {
    functionsStack.shift()
  }
}

function _compile(query: JSONQuery, functions: FunctionsMap): Evaluator {
  if (isArray(query)) {
    // function
    if (isString(query[0])) {
      return fun(query as JSONQueryFunction, functions)
    }

    // pipe
    return pipe(query as JSONQueryPipe)
  }

  // object
  if (isObject(query)) {
    return object(query as JSONQueryObject)
  }

  // value (string, number, boolean, null)
  return () => query
}

function fun(query: JSONQueryFunction, functions: FunctionsMap) {
  const [fnName, ...args] = query

  const fn = functions[fnName]
  if (!fn) {
    throw new Error(`Unknown function "${fnName}"`)
  }

  return fn(...args)
}

function pipe(entries: JSONQuery[]) {
  const _entries = entries.map((entry) => compile(entry))
  return (data: unknown) => _entries.reduce((data, evaluator) => evaluator(data), data)
}

function object(query: JSONQueryObject) {
  const getters: Getter[] = Object.keys(query).map((key) => [key, compile(query[key])])

  return (data: unknown) => {
    const obj = {}
    getters.forEach(([key, getter]) => (obj[key] = getter(data)))
    return obj
  }
}
