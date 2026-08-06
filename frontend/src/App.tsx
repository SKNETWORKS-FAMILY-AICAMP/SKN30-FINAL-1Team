import { BrowserRouter, Route, Routes } from 'react-router'

import { ROUTES } from '@/constants/routes'
import Home from '@/pages/Home'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.HOME} element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}
