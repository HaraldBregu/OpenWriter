import { useState } from "react"

type TCounter = {
    increment: () => void,
    decrement: () => void,
    reset: () => void
}

export const useCounter = (init: number = 0): [number, TCounter] => {
    const [counter, setCounter] = useState<number>(init)


  const increment = () => setCounter(prev => prev + 1);
  const decrement = () => setCounter(prev => prev - 1);
  const reset = () => setCounter(init);

    return [counter, {increment, decrement, reset}]
}