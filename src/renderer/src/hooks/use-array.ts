import { useState } from "react"

type TCrudArray<T> = {
    add: (el: T) => void,
    remove: (i: number) => void,
    update: (i: number, newVal: T) => void
    replace: (val: T[]) => void
}

export const useArray = <T,>(init: T[]): [T[], TCrudArray<T>] => {
    const [arr, setArr] = useState<T[]>(init ?? [])

    const add = (el) => setArr(prev => [...prev, el])
    const remove = i => setArr(prev => [...prev.slice(0, i), ...prev.slice(i + 1)])
    const update = (i, newVal) => setArr(prev => prev.with(i, newVal))
    const replace = val => {
        if (arr.length === val.length && arr.every((v, i) => v === val[i])) return;
        setArr(val)
    }

    return [arr, { add, remove, update, replace }]
}