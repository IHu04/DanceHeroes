import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import VRMApp from './VisualizeModel'
import { VRM } from '@pixiv/three-vrm'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <VRMApp></VRMApp>
    </>
  )
}

export default App
